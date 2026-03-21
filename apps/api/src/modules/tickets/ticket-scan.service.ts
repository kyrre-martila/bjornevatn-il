import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  Prisma,
  TicketScanAction,
  TicketScanResult,
  TicketStatus,
  TicketValidationStatus,
  OperationalEventSeverity,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { TicketQrService } from "./ticket-qr.service";
import { ObservabilityService } from "../observability/observability.service";

type ScanReason =
  | "valid"
  | "already-used"
  | "cancelled"
  | "revoked"
  | "not-found"
  | "invalid-qr";

@Injectable()
export class TicketScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrService: TicketQrService,
    @Optional()
    @Inject(ObservabilityService)
    private readonly observability: Pick<ObservabilityService, "logEvent"> = {
      logEvent: async () => undefined,
    },
  ) {}

  private async writeLog(input: {
    ticketId?: string;
    scannedBy?: string;
    action: TicketScanAction;
    result: TicketScanResult;
    notes?: string;
  }) {
    await this.prisma.ticketScanLog.create({
      data: {
        ticketId: input.ticketId,
        scannedBy: input.scannedBy,
        action: input.action,
        result: input.result,
        notes: input.notes,
      },
    });
  }

  private async logScanEvent(input: {
    eventType:
      | "ticket_scan_success"
      | "ticket_scan_conflict"
      | "ticket_scan_override"
      | "ticket_scan_invalid";
    severity?: OperationalEventSeverity;
    ticketId?: string | null;
    orderReference?: string | null;
    matchId?: string | null;
    reason?: string;
    scanCount?: number;
    notes?: string;
  }) {
    await this.observability.logEvent({
      eventType: input.eventType,
      severity: input.severity ?? OperationalEventSeverity.info,
      actor: input.notes?.includes("override") ? { type: "admin" } : undefined,
      context: { module: "tickets", route: "scanner" },
      metadata: {
        ticketId: input.ticketId ?? null,
        orderReference: input.orderReference ?? null,
        matchId: input.matchId ?? null,
        reason: input.reason ?? null,
        scanCount: input.scanCount ?? 0,
        notes: input.notes ?? null,
      },
    });
  }

  private mapTicketScanResult(reason: ScanReason): TicketScanResult {
    switch (reason) {
      case "valid":
        return TicketScanResult.success;
      case "already-used":
        return TicketScanResult.already_used;
      case "cancelled":
        return TicketScanResult.cancelled;
      case "revoked":
        return TicketScanResult.revoked;
      case "not-found":
        return TicketScanResult.not_found;
      case "invalid-qr":
      default:
        return TicketScanResult.invalid;
    }
  }

  private deriveScanReason(
    ticket: {
      status: TicketStatus;
      validationStatus: TicketValidationStatus;
      isRevoked: boolean;
    },
    allowOverride?: boolean,
  ): ScanReason {
    if (
      ticket.status === TicketStatus.cancelled ||
      ticket.validationStatus === TicketValidationStatus.cancelled
    ) {
      return "cancelled";
    }

    if (
      ticket.isRevoked ||
      ticket.validationStatus === TicketValidationStatus.revoked
    ) {
      return "revoked";
    }

    if (
      ticket.status === TicketStatus.used ||
      ticket.validationStatus === TicketValidationStatus.used
    ) {
      return allowOverride ? "valid" : "already-used";
    }

    return "valid";
  }

  private buildResult(
    ticket: Prisma.TicketGetPayload<{
      include: { ticketSale: { include: { match: true } } };
    }> | null,
    reason: ScanReason,
  ) {
    return {
      isValid: reason === "valid",
      reason,
      ticket: ticket
        ? {
            id: ticket.id,
            buyerName: ticket.buyerName,
            ticketType: ticket.ticketType,
            orderReference: ticket.orderReference,
            validationStatus: ticket.validationStatus,
            scanCount: ticket.scanCount,
            lastScannedAt: ticket.lastScannedAt,
          }
        : null,
      match: ticket
        ? {
            id: ticket.ticketSale.match.id,
            title: ticket.ticketSale.title,
            data: ticket.ticketSale.match.data,
          }
        : null,
      scanCount: ticket?.scanCount ?? 0,
      lastScannedAt: ticket?.lastScannedAt ?? null,
    };
  }

  async validateScan(input: {
    qrCodeValue: string;
    scannedBy?: string;
    allowOverride?: boolean;
  }) {
    const qrCodeValue = input.qrCodeValue.trim();
    if (!this.qrService.isPayloadShapeValid(qrCodeValue)) {
      await this.writeLog({
        scannedBy: input.scannedBy,
        action: TicketScanAction.validate,
        result: TicketScanResult.invalid,
        notes: "Malformed QR payload",
      });
      await this.logScanEvent({
        eventType: "ticket_scan_invalid",
        severity: OperationalEventSeverity.warn,
        reason: "invalid-qr",
      });
      return this.buildResult(null, "invalid-qr");
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCodeValue },
      include: { ticketSale: { include: { match: true } } },
    });

    if (!ticket) {
      await this.writeLog({
        scannedBy: input.scannedBy,
        action: TicketScanAction.validate,
        result: TicketScanResult.not_found,
      });
      await this.logScanEvent({
        eventType: "ticket_scan_invalid",
        severity: OperationalEventSeverity.warn,
        reason: "not-found",
      });
      return this.buildResult(null, "not-found");
    }

    const reason = this.deriveScanReason(ticket, input.allowOverride);

    await this.writeLog({
      ticketId: ticket.id,
      scannedBy: input.scannedBy,
      action: TicketScanAction.validate,
      result: this.mapTicketScanResult(reason),
      notes: input.allowOverride ? "Manual override enabled" : undefined,
    });

    if (reason === "already-used") {
      await this.logScanEvent({
        eventType: "ticket_scan_conflict",
        severity: OperationalEventSeverity.warn,
        ticketId: ticket.id,
        orderReference: ticket.orderReference,
        matchId: ticket.ticketSale.match.id,
        reason,
        scanCount: ticket.scanCount,
      });
    }

    return this.buildResult(ticket, reason);
  }

  async confirmEntry(input: {
    qrCodeValue: string;
    scannedBy?: string;
    allowOverride?: boolean;
    notes?: string;
  }) {
    const validation = await this.validateScan({
      qrCodeValue: input.qrCodeValue,
      scannedBy: input.scannedBy,
      allowOverride: input.allowOverride,
    });

    if (!validation.ticket || (!validation.isValid && !input.allowOverride)) {
      return validation;
    }

    const now = new Date();
    const updatedCount = await this.prisma.ticket.updateMany({
      where: input.allowOverride
        ? { id: validation.ticket.id }
        : {
            id: validation.ticket.id,
            status: { not: TicketStatus.used },
            validationStatus: { not: TicketValidationStatus.used },
          },
      data: {
        scanCount: { increment: 1 },
        firstScannedAt: validation.ticket.scanCount > 0 ? undefined : now,
        lastScannedAt: now,
        lastScannedBy: input.scannedBy,
        validationStatus: TicketValidationStatus.used,
        status: TicketStatus.used,
      },
    });

    if (updatedCount.count === 0) {
      const current = await this.prisma.ticket.findUnique({
        where: { id: validation.ticket.id },
        include: { ticketSale: { include: { match: true } } },
      });
      await this.writeLog({
        ticketId: validation.ticket.id,
        scannedBy: input.scannedBy,
        action: TicketScanAction.confirm_entry,
        result: TicketScanResult.already_used,
        notes: "Concurrent scan detected",
      });
      await this.logScanEvent({
        eventType: "ticket_scan_conflict",
        severity: OperationalEventSeverity.warn,
        ticketId: validation.ticket.id,
        orderReference:
          current?.orderReference ?? validation.ticket.orderReference,
        matchId: current?.ticketSale.match.id ?? null,
        reason: "already-used",
        scanCount: current?.scanCount ?? validation.ticket.scanCount,
        notes: "Concurrent scan detected",
      });
      return this.buildResult(current, "already-used");
    }

    const updated = await this.prisma.ticket.findUniqueOrThrow({
      where: { id: validation.ticket.id },
      include: { ticketSale: { include: { match: true } } },
    });

    await this.writeLog({
      ticketId: updated.id,
      scannedBy: input.scannedBy,
      action: input.allowOverride
        ? TicketScanAction.override_entry
        : TicketScanAction.confirm_entry,
      result: input.allowOverride
        ? TicketScanResult.already_used
        : TicketScanResult.success,
      notes: input.notes,
    });

    await this.logScanEvent({
      eventType: input.allowOverride
        ? "ticket_scan_override"
        : "ticket_scan_success",
      severity: input.allowOverride
        ? OperationalEventSeverity.warn
        : OperationalEventSeverity.info,
      ticketId: updated.id,
      orderReference: updated.orderReference,
      matchId: updated.ticketSale.match.id,
      reason: input.allowOverride ? "override" : "valid",
      scanCount: updated.scanCount,
      notes: input.notes,
    });

    return this.buildResult(updated, "valid");
  }

  async getRecentLogs(ticketId: string, limit = 10) {
    return this.prisma.ticketScanLog.findMany({
      where: { ticketId },
      orderBy: { scannedAt: "desc" },
      take: limit,
    });
  }
}
