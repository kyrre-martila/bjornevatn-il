import { Inject, Injectable, Optional } from "@nestjs/common";
import {
  MatchSyncImportMode,
  MatchSyncSourceType,
  Prisma,
  WorkflowStatus,
  OperationalEventSeverity,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MATCH_STATUSES,
  MatchSyncSettingsDto,
  MatchSyncSummary,
  ProviderMatch,
} from "./matches-sync.types";
import { ICalMatchProvider } from "./providers/ical-match.provider";
import {
  type ObservabilityActorContext,
  type ObservabilityRouteContext,
  type OperationalEventInput,
  ObservabilityService,
} from "../observability/observability.service";

function toArrayOfStrings(value: Prisma.JsonValue | null): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function makeMatchSlug(input: ProviderMatch): string {
  return `${input.homeTeam}-${input.awayTeam}-${input.matchDate}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type MatchesSyncObservability = {
  createMatchSyncRun(input: {
    provider: MatchSyncSourceType;
    actor?: ObservabilityActorContext;
  }): Promise<{ id: string }>;
  completeMatchSyncRun(input: {
    runId: string;
    status: "succeeded" | "failed";
    counts: MatchSyncSummary;
    durationMs: number;
    failureReason?: string | null;
  }): Promise<unknown>;
  logEvent(input: OperationalEventInput): Promise<void>;
};

@Injectable()
export class MatchesSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly icalProvider: ICalMatchProvider,
    @Optional()
    @Inject(ObservabilityService)
    private readonly observability: MatchesSyncObservability = {
      createMatchSyncRun: async () => ({ id: "local-run" }),
      completeMatchSyncRun: async () => undefined,
      logEvent: async () => undefined,
    },
  ) {}

  async getSettings(): Promise<MatchSyncSettingsDto> {
    const settings = await this.prisma.fotballNoSettings.upsert({
      where: { id: "fotball-no-settings" },
      update: {},
      create: { id: "fotball-no-settings" },
    });

    return {
      id: settings.id,
      enabled: settings.enabled,
      clubName: settings.clubName,
      clubId: settings.clubId,
      teamIds: toArrayOfStrings(settings.teamIds),
      sourceType: settings.sourceType,
      importMode: settings.importMode,
      autoSyncEnabled: settings.autoSyncEnabled,
      syncIntervalMinutes: settings.syncIntervalMinutes,
      lastSyncAt: settings.lastSyncAt?.toISOString() ?? null,
      lastSyncStatus: settings.lastSyncStatus,
      lastSyncMessage: settings.lastSyncMessage,
    };
  }

  async updateSettings(input: {
    enabled: boolean;
    clubName?: string | null;
    clubId?: string | null;
    teamIds?: string[];
    sourceType: MatchSyncSourceType;
    importMode: MatchSyncImportMode;
    autoSyncEnabled: boolean;
    syncIntervalMinutes: number;
  }) {
    const settings = await this.prisma.fotballNoSettings.upsert({
      where: { id: "fotball-no-settings" },
      update: {
        enabled: input.enabled,
        clubName: input.clubName ?? null,
        clubId: input.clubId ?? null,
        teamIds: input.teamIds ?? [],
        sourceType: input.sourceType,
        importMode: input.importMode,
        autoSyncEnabled: input.autoSyncEnabled,
        syncIntervalMinutes: input.syncIntervalMinutes,
      },
      create: {
        id: "fotball-no-settings",
        enabled: input.enabled,
        clubName: input.clubName ?? null,
        clubId: input.clubId ?? null,
        teamIds: input.teamIds ?? [],
        sourceType: input.sourceType,
        importMode: input.importMode,
        autoSyncEnabled: input.autoSyncEnabled,
        syncIntervalMinutes: input.syncIntervalMinutes,
      },
    });

    return settings;
  }

  async listMatches(filters: {
    source?: string;
    upcoming?: boolean;
    ticketSalesEnabled?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const contentType = await this.prisma.contentType.findUnique({
      where: { slug: "match" },
    });
    if (!contentType) {
      return {
        items: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
        filters: {},
      };
    }

    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * pageSize;

    const nowIso = new Date().toISOString();
    const where: Prisma.ContentItemWhereInput = {
      contentTypeId: contentType.id,
      published: true,
      AND: [
        filters.source
          ? { data: { path: ["externalSource"], equals: filters.source } }
          : {},
        typeof filters.ticketSalesEnabled === "boolean"
          ? {
              data: {
                path: ["ticketSalesEnabled"],
                equals: filters.ticketSalesEnabled,
              },
            }
          : {},
        filters.upcoming === true
          ? { data: { path: ["matchDate"], gte: nowIso } }
          : filters.upcoming === false
            ? { data: { path: ["matchDate"], lt: nowIso } }
            : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.contentItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: { id: true, data: true },
      }),
      this.prisma.contentItem.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const data = item.data as Record<string, unknown>;
        return {
          id: item.id,
          homeTeam: String(data.homeTeam ?? ""),
          awayTeam: String(data.awayTeam ?? ""),
          matchDate: String(data.matchDate ?? ""),
          venue: String(data.venue ?? ""),
          externalSource: String(data.externalSource ?? "manual"),
          status: String(data.status ?? "scheduled"),
          ticketSalesEnabled: Boolean(data.ticketSalesEnabled ?? false),
          lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : null,
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      filters: {
        source: filters.source ?? null,
        upcoming:
          typeof filters.upcoming === "boolean"
            ? filters.upcoming
              ? "upcoming"
              : "past"
            : null,
        ticketSalesEnabled:
          typeof filters.ticketSalesEnabled === "boolean"
            ? filters.ticketSalesEnabled
            : null,
      },
    };
  }

  private async getProvider(sourceType: MatchSyncSourceType) {
    if (sourceType === "ical") {
      return this.icalProvider;
    }
    // Future extension: dedicated FotballNoProvider when structured endpoints are available.
    return this.icalProvider;
  }

  async runSync(input?: {
    actor?: ObservabilityActorContext;
    context?: ObservabilityRouteContext;
  }): Promise<MatchSyncSummary> {
    const settings = await this.prisma.fotballNoSettings.findUnique({
      where: { id: "fotball-no-settings" },
    });
    if (!settings || !settings.enabled) {
      return { created: 0, updated: 0, skipped: 0, failed: 0 };
    }

    const provider = await this.getProvider(settings.sourceType);
    const startedAt = Date.now();
    const run = await this.observability.createMatchSyncRun({
      provider: settings.sourceType,
      actor: input?.actor,
    });

    await this.observability.logEvent({
      eventType: "match_sync_started",
      severity: OperationalEventSeverity.info,
      actor: input?.actor,
      context: input?.context ?? {
        module: "matches-sync",
        route: "admin/sync",
      },
      metadata: {
        provider: settings.sourceType,
        importMode: settings.importMode,
      },
    });

    try {
      const providerMatches = await provider.fetchMatches({
        clubId: settings.clubId,
        teamIds: toArrayOfStrings(settings.teamIds),
      });

      const contentType = await this.prisma.contentType.findUnique({
        where: { slug: "match" },
      });
      if (!contentType) {
        throw new Error("Missing 'match' content type");
      }

      const summary: MatchSyncSummary = {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      };

      for (const row of providerMatches) {
        try {
          if (!MATCH_STATUSES.includes(row.status) || !row.externalId) {
            summary.failed += 1;
            continue;
          }

          const existing = await this.prisma.contentItem.findFirst({
            where: {
              contentTypeId: contentType.id,
              data: {
                path: ["externalId"],
                equals: row.externalId,
              },
            },
          });

          const nextData = {
            externalSource: "fotball-no",
            externalId: row.externalId,
            externalTeamId: row.externalTeamId,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            matchDate: row.matchDate,
            league: row.league,
            venue: row.venue,
            isHomeMatch: row.isHomeMatch,
            status: row.status,
            sourceUrl: row.sourceUrl,
            lastSyncedAt: new Date().toISOString(),
            syncHash: JSON.stringify(row),
            ticketSalesEnabled: false,
          } as Record<string, unknown>;

          if (!existing) {
            await this.prisma.contentItem.create({
              data: {
                contentTypeId: contentType.id,
                slug: makeMatchSlug(row),
                title: `${row.homeTeam} vs ${row.awayTeam}`,
                data: nextData as Prisma.InputJsonValue,
                published: true,
                workflowStatus: WorkflowStatus.published,
              },
            });
            summary.created += 1;
            continue;
          }

          if (settings.importMode === "create_only") {
            summary.skipped += 1;
            continue;
          }

          const existingData = existing.data as Record<string, unknown>;
          await this.prisma.contentItem.update({
            where: { id: existing.id },
            data: {
              title: `${row.homeTeam} vs ${row.awayTeam}`,
              data: {
                ...existingData,
                ...nextData,
                ticketSalesEnabled:
                  typeof existingData.ticketSalesEnabled === "boolean"
                    ? existingData.ticketSalesEnabled
                    : false,
              } as Prisma.InputJsonValue,
            },
          });
          summary.updated += 1;
        } catch {
          summary.failed += 1;
        }
      }

      await this.prisma.fotballNoSettings.update({
        where: { id: "fotball-no-settings" },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
          lastSyncMessage: `Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}`,
        },
      });

      const durationMs = Date.now() - startedAt;
      await this.observability.completeMatchSyncRun({
        runId: run.id,
        status: summary.failed > 0 ? "failed" : "succeeded",
        counts: summary,
        durationMs,
        failureReason:
          summary.failed > 0
            ? "One or more provider rows failed validation or persistence."
            : null,
      });
      await this.observability.logEvent({
        eventType:
          summary.failed > 0 ? "match_sync_failed" : "match_sync_succeeded",
        severity:
          summary.failed > 0
            ? OperationalEventSeverity.warn
            : OperationalEventSeverity.info,
        actor: input?.actor,
        context: input?.context ?? {
          module: "matches-sync",
          route: "admin/sync",
        },
        metadata: {
          provider: settings.sourceType,
          created: summary.created,
          updated: summary.updated,
          skipped: summary.skipped,
          failed: summary.failed,
          durationMs,
          failureReason:
            summary.failed > 0
              ? "One or more provider rows failed validation or persistence."
              : null,
        },
      });

      return summary;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown sync error";
      await this.prisma.fotballNoSettings.update({
        where: { id: "fotball-no-settings" },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncMessage: message,
        },
      });

      const durationMs = Date.now() - startedAt;
      await this.observability.completeMatchSyncRun({
        runId: run.id,
        status: "failed",
        counts: { created: 0, updated: 0, skipped: 0, failed: 1 },
        durationMs,
        failureReason: message,
      });
      await this.observability.logEvent({
        eventType: "match_sync_failed",
        severity: OperationalEventSeverity.error,
        actor: input?.actor,
        context: input?.context ?? {
          module: "matches-sync",
          route: "admin/sync",
        },
        metadata: {
          provider: settings.sourceType,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
          durationMs,
          failureReason: message,
        },
      });

      return { created: 0, updated: 0, skipped: 0, failed: 1 };
    }
  }
}
