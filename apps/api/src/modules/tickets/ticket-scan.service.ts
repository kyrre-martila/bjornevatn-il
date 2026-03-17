import { Injectable } from "@nestjs/common";
import {
  Prisma,
  TicketScanAction,
  TicketScanResult,
  TicketStatus,
  TicketValidationStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { TicketQrService } from "./ticket-qr.service";

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

  private buildResult(ticket: Prisma.TicketGetPayload<{ include: { ticketSale: { include: { match: true } } } }> | null, reason: ScanReason) {
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

  async validateScan(input: { qrCodeValue: string; scannedBy?: string; allowOverride?: boolean }) {
    const qrCodeValue = input.qrCodeValue.trim();
    if (!this.qrService.isPayloadShapeValid(qrCodeValue)) {
      await this.writeLog({
        scannedBy: input.scannedBy,
        action: TicketScanAction.validate,
        result: TicketScanResult.invalid,
        notes: "Malformed QR payload",
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
      return this.buildResult(null, "not-found");
    }

    let reason: ScanReason = "valid";
    if (ticket.validationStatus === TicketValidationStatus.cancelled || ticket.status === TicketStatus.cancelled) {
      reason = "cancelled";
    } else if (ticket.isRevoked || ticket.validationStatus === TicketValidationStatus.revoked) {
      reason = "revoked";
    } else if (ticket.validationStatus === TicketValidationStatus.used || ticket.status === TicketStatus.used) {
      reason = input.allowOverride ? "valid" : "already-used";
    }

    await this.writeLog({
      ticketId: ticket.id,
      scannedBy: input.scannedBy,
      action: TicketScanAction.validate,
      result: this.mapTicketScanResult(reason),
      notes: input.allowOverride ? "Manual override enabled" : undefined,
    });

    return this.buildResult(ticket, reason);
  }

  async confirmEntry(input: { qrCodeValue: string; scannedBy?: string; allowOverride?: boolean; notes?: string }) {
    const validation = await this.validateScan({
      qrCodeValue: input.qrCodeValue,
      scannedBy: input.scannedBy,
      allowOverride: input.allowOverride,
    });

    if (!validation.ticket || (!validation.isValid && !input.allowOverride)) {
      return validation;
    }

    const now = new Date();
    const updated = await this.prisma.ticket.update({
      where: { id: validation.ticket.id },
      data: {
        scanCount: { increment: 1 },
        firstScannedAt: validation.ticket.scanCount > 0 ? undefined : now,
        lastScannedAt: now,
        lastScannedBy: input.scannedBy,
        validationStatus: TicketValidationStatus.used,
        status: TicketStatus.used,
      },
      include: { ticketSale: { include: { match: true } } },
    });

    await this.writeLog({
      ticketId: updated.id,
      scannedBy: input.scannedBy,
      action: input.allowOverride ? TicketScanAction.override_entry : TicketScanAction.confirm_entry,
      result: input.allowOverride ? TicketScanResult.already_used : TicketScanResult.success,
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
