import { Injectable } from "@nestjs/common";
import {
  MatchSyncImportMode,
  MatchSyncSourceType,
  Prisma,
  WorkflowStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  MATCH_EXTERNAL_SOURCES,
  MATCH_STATUSES,
  MatchSyncSettingsDto,
  MatchSyncSummary,
  ProviderMatch,
} from "./matches-sync.types";
import { ICalMatchProvider } from "./providers/ical-match.provider";

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

@Injectable()
export class MatchesSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly icalProvider: ICalMatchProvider,
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
  }) {
    const contentType = await this.prisma.contentType.findUnique({
      where: { slug: "match" },
    });
    if (!contentType) return [];

    const items = await this.prisma.contentItem.findMany({
      where: {
        contentTypeId: contentType.id,
        published: true,
      },
      orderBy: { createdAt: "desc" },
      include: { ticketSale: true },
    });

    const now = Date.now();

    return items
      .map((item) => {
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
      })
      .filter((entry) =>
        filters.source ? entry.externalSource === filters.source : true,
      )
      .filter((entry) => {
        if (filters.upcoming === undefined) return true;
        const when = new Date(entry.matchDate).getTime();
        return filters.upcoming ? when > now : when <= now;
      })
      .filter((entry) =>
        filters.ticketSalesEnabled === undefined
          ? true
          : entry.ticketSalesEnabled === filters.ticketSalesEnabled,
      );
  }

  private async getProvider(sourceType: MatchSyncSourceType) {
    if (sourceType === "ical") {
      return this.icalProvider;
    }
    // Future extension: dedicated FotballNoProvider when structured endpoints are available.
    return this.icalProvider;
  }

  async runSync(): Promise<MatchSyncSummary> {
    const settings = await this.prisma.fotballNoSettings.findUnique({
      where: { id: "fotball-no-settings" },
    });
    if (!settings || !settings.enabled) {
      return { created: 0, updated: 0, skipped: 0, failed: 0 };
    }

    const provider = await this.getProvider(settings.sourceType);

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

      return { created: 0, updated: 0, skipped: 0, failed: 1 };
    }
  }
}
