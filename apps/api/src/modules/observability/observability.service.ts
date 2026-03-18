import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  MatchSyncSourceType,
  OperationalEventSeverity,
  Prisma,
} from "@prisma/client";
import type { Logger as PinoLogger } from "pino";
import { LOGGER_TOKEN } from "../../common/logging/logger.module";
import { redactSensitiveData } from "../../common/logging/redaction.util";
import { PrismaService } from "../../prisma/prisma.service";

export const OPERATIONAL_EVENT_TYPES = [
  "rate_limit_triggered",
  "public_submission_failed",
  "public_submission_succeeded",
  "order_lookup_failed",
  "order_lookup_succeeded",
  "ticket_scan_conflict",
  "ticket_scan_override",
  "ticket_scan_success",
  "ticket_scan_invalid",
  "match_sync_started",
  "match_sync_succeeded",
  "match_sync_failed",
  "media_upload_failed",
  "media_upload_succeeded",
  "admin_action_failed",
  "challenge_verification_failed",
  "request_timed",
  "slow_request_detected",
] as const;

export type OperationalEventType = (typeof OPERATIONAL_EVENT_TYPES)[number];

export type ObservabilityActorContext = {
  id?: string | null;
  role?: string | null;
  type?: string | null;
};

export type ObservabilityRouteContext = {
  route?: string | null;
  module?: string | null;
  requestId?: string | null;
};

export type OperationalEventInput = {
  eventType: OperationalEventType;
  severity?: OperationalEventSeverity;
  actor?: ObservabilityActorContext;
  context?: ObservabilityRouteContext;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export type TimedOperationInput = {
  flow: string;
  severity?: OperationalEventSeverity;
  actor?: ObservabilityActorContext;
  context?: ObservabilityRouteContext;
  metadata?: Record<string, unknown>;
  slowThresholdMs?: number;
  slowMetadata?: Record<string, unknown>;
};

export type ObservabilityRange = "today" | "last7Days" | "last30Days";

const EVENT_LIST_LIMIT = 12;

function toRangeStart(range: ObservabilityRange): Date {
  const now = new Date();
  switch (range) {
    case "today": {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case "last7Days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "last30Days":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function clampFailureReason(message?: string | null): string | null {
  if (!message) return null;
  const trimmed = message.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 500);
}

@Injectable()
export class ObservabilityService {
  private readonly fallbackLogger = new Logger(ObservabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER_TOKEN) private readonly logger: PinoLogger,
  ) {}

  private sanitizeMetadata(
    metadata?: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    if (!metadata) return undefined;
    const redacted = redactSensitiveData(metadata);
    return redacted as Prisma.InputJsonValue;
  }

  async logEvent(input: OperationalEventInput): Promise<void> {
    const payload = {
      timestamp: (input.createdAt ?? new Date()).toISOString(),
      eventType: input.eventType,
      severity: input.severity ?? OperationalEventSeverity.info,
      actor: {
        actorId: input.actor?.id ?? null,
        actorRole: input.actor?.role ?? null,
        actorType: input.actor?.type ?? null,
      },
      context: {
        route: input.context?.route ?? null,
        module: input.context?.module ?? null,
        requestId: input.context?.requestId ?? null,
      },
      metadata: input.metadata ?? {},
    };

    this.logger[
      input.severity === OperationalEventSeverity.error
        ? "error"
        : input.severity === OperationalEventSeverity.warn
          ? "warn"
          : "info"
    ]({ operationalEvent: payload }, `Operational event: ${input.eventType}`);

    try {
      await this.prisma.operationalEvent.create({
        data: {
          eventType: input.eventType,
          severity: input.severity ?? OperationalEventSeverity.info,
          actorId: input.actor?.id ?? null,
          actorRole: input.actor?.role ?? null,
          actorType: input.actor?.type ?? null,
          requestId: input.context?.requestId ?? null,
          route: input.context?.route ?? null,
          module: input.context?.module ?? null,
          metadata: this.sanitizeMetadata(input.metadata),
          createdAt: input.createdAt,
        },
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.fallbackLogger.warn(
        `Failed to persist operational event: ${details}`,
      );
    }
  }

  async timeOperation<T>(
    input: TimedOperationInput,
    operation: () => Promise<T>,
  ): Promise<T> {
    const startedAt = Date.now();

    try {
      const result = await operation();
      const durationMs = Date.now() - startedAt;
      await this.logEvent({
        eventType: "request_timed",
        severity: input.severity ?? OperationalEventSeverity.info,
        actor: input.actor,
        context: input.context,
        metadata: {
          ...input.metadata,
          flow: input.flow,
          durationMs,
        },
      });

      if (input.slowThresholdMs && durationMs >= input.slowThresholdMs) {
        await this.logEvent({
          eventType: "slow_request_detected",
          severity: OperationalEventSeverity.warn,
          actor: input.actor,
          context: input.context,
          metadata: {
            ...input.metadata,
            ...input.slowMetadata,
            flow: input.flow,
            durationMs,
            thresholdMs: input.slowThresholdMs,
          },
        });
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      await this.logEvent({
        eventType: "request_timed",
        severity: OperationalEventSeverity.error,
        actor: input.actor,
        context: input.context,
        metadata: {
          ...input.metadata,
          flow: input.flow,
          durationMs,
          failed: true,
          reason:
            error instanceof Error
              ? clampFailureReason(error.message)
              : "Unknown error",
        },
      });
      throw error;
    }
  }

  async createMatchSyncRun(input: {
    provider: MatchSyncSourceType;
    actor?: ObservabilityActorContext;
  }) {
    return this.prisma.matchSyncRun.create({
      data: {
        provider: input.provider,
        status: "started",
        triggeredByUserId: input.actor?.id ?? null,
      },
    });
  }

  async completeMatchSyncRun(input: {
    runId: string;
    status: "succeeded" | "failed";
    counts: {
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
    durationMs: number;
    failureReason?: string | null;
  }) {
    return this.prisma.matchSyncRun.update({
      where: { id: input.runId },
      data: {
        status: input.status,
        completedAt: new Date(),
        durationMs: input.durationMs,
        createdCount: input.counts.created,
        updatedCount: input.counts.updated,
        skippedCount: input.counts.skipped,
        failedCount: input.counts.failed,
        failureReason: clampFailureReason(input.failureReason),
      },
    });
  }

  async getDashboard(range: ObservabilityRange) {
    const startAt = toRangeStart(range);
    const eventWhere: Prisma.OperationalEventWhereInput = {
      createdAt: { gte: startAt },
    };

    const [
      recentEvents,
      recentRateLimitEvents,
      recentScanConflicts,
      recentSubmissionFailures,
      recentSyncRuns,
      bookingCount,
      membershipCount,
      orderReferences,
      scanConflictCount,
      matchSyncFailureCount,
      eventsForTrends,
      runsForTrends,
    ] = await Promise.all([
      this.prisma.operationalEvent.findMany({
        where: eventWhere,
        orderBy: { createdAt: "desc" },
        take: EVENT_LIST_LIMIT,
      }),
      this.prisma.operationalEvent.findMany({
        where: { ...eventWhere, eventType: "rate_limit_triggered" },
        orderBy: { createdAt: "desc" },
        take: EVENT_LIST_LIMIT,
      }),
      this.prisma.operationalEvent.findMany({
        where: { ...eventWhere, eventType: "ticket_scan_conflict" },
        orderBy: { createdAt: "desc" },
        take: EVENT_LIST_LIMIT,
      }),
      this.prisma.operationalEvent.findMany({
        where: { ...eventWhere, eventType: "public_submission_failed" },
        orderBy: { createdAt: "desc" },
        take: EVENT_LIST_LIMIT,
      }),
      this.prisma.matchSyncRun.findMany({
        where: { startedAt: { gte: startAt } },
        orderBy: { startedAt: "desc" },
        take: EVENT_LIST_LIMIT,
      }),
      this.prisma.clubhouseBooking.count({
        where: { createdAt: { gte: startAt } },
      }),
      this.prisma.membershipApplication.count({
        where: { createdAt: { gte: startAt } },
      }),
      this.prisma.ticket.findMany({
        where: { createdAt: { gte: startAt } },
        select: { orderReference: true },
        distinct: ["orderReference"],
      }),
      this.prisma.ticketScanLog.count({
        where: {
          scannedAt: { gte: startAt },
          result: "already_used",
        },
      }),
      this.prisma.matchSyncRun.count({
        where: { startedAt: { gte: startAt }, status: "failed" },
      }),
      this.prisma.operationalEvent.findMany({
        where: {
          createdAt: { gte: startAt },
          eventType: {
            in: [
              "public_submission_failed",
              "rate_limit_triggered",
              "ticket_scan_conflict",
            ],
          },
        },
        select: {
          eventType: true,
          route: true,
          metadata: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.matchSyncRun.findMany({
        where: { startedAt: { gte: startAt }, status: "failed" },
        select: { provider: true, startedAt: true },
        orderBy: { startedAt: "asc" },
      }),
    ]);

    const failedBookingsByDay = new Map<string, number>();
    const rateLimitHitsByEndpoint = new Map<string, number>();
    const scanConflictsByDay = new Map<string, number>();

    for (const event of eventsForTrends) {
      if (event.eventType === "public_submission_failed") {
        const moduleName = (event.metadata as Record<string, unknown> | null)
          ?.submissionType;
        if (moduleName === "clubhouse_booking") {
          const key = dayKey(event.createdAt);
          failedBookingsByDay.set(key, (failedBookingsByDay.get(key) ?? 0) + 1);
        }
      }

      if (event.eventType === "rate_limit_triggered") {
        const endpoint = String(
          (event.metadata as Record<string, unknown> | null)
            ?.endpointCategory ??
            event.route ??
            "unknown",
        );
        rateLimitHitsByEndpoint.set(
          endpoint,
          (rateLimitHitsByEndpoint.get(endpoint) ?? 0) + 1,
        );
      }

      if (event.eventType === "ticket_scan_conflict") {
        const key = dayKey(event.createdAt);
        scanConflictsByDay.set(key, (scanConflictsByDay.get(key) ?? 0) + 1);
      }
    }

    const syncFailuresByProvider = new Map<string, number>();
    for (const run of runsForTrends) {
      syncFailuresByProvider.set(
        run.provider,
        (syncFailuresByProvider.get(run.provider) ?? 0) + 1,
      );
    }

    return {
      range,
      startAt: startAt.toISOString(),
      recentEvents: recentEvents.map(this.mapEvent),
      recentRateLimitEvents: recentRateLimitEvents.map(this.mapEvent),
      recentTicketScanConflicts: recentScanConflicts.map(this.mapEvent),
      recentPublicSubmissionFailures: recentSubmissionFailures.map(
        this.mapEvent,
      ),
      recentSyncRuns: recentSyncRuns.map((run) => ({
        id: run.id,
        provider: run.provider,
        status: run.status,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        durationMs: run.durationMs,
        createdCount: run.createdCount,
        updatedCount: run.updatedCount,
        skippedCount: run.skippedCount,
        failedCount: run.failedCount,
        failureReason: run.failureReason,
      })),
      counts: {
        bookingsSubmitted: bookingCount,
        membershipsSubmitted: membershipCount,
        ticketOrdersCreated: orderReferences.length,
        scanConflicts: scanConflictCount,
        matchSyncFailures: matchSyncFailureCount,
      },
      trends: {
        failedBookingsByDay: Array.from(failedBookingsByDay.entries()).map(
          ([date, count]) => ({ date, count }),
        ),
        rateLimitHitsByEndpoint: Array.from(
          rateLimitHitsByEndpoint.entries(),
        ).map(([endpoint, count]) => ({ endpoint, count })),
        scanConflictsByDay: Array.from(scanConflictsByDay.entries()).map(
          ([date, count]) => ({ date, count }),
        ),
        syncFailuresByProvider: Array.from(
          syncFailuresByProvider.entries(),
        ).map(([provider, count]) => ({ provider, count })),
      },
    };
  }

  private mapEvent(event: {
    id: string;
    eventType: string;
    severity: OperationalEventSeverity;
    actorId: string | null;
    actorRole: string | null;
    actorType: string | null;
    route: string | null;
    module: string | null;
    requestId: string | null;
    metadata: Prisma.JsonValue;
    createdAt: Date;
  }) {
    return {
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      actorId: event.actorId,
      actorRole: event.actorRole,
      actorType: event.actorType,
      route: event.route,
      module: event.module,
      requestId: event.requestId,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
