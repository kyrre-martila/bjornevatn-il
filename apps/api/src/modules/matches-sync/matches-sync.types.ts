import { MatchSyncImportMode, MatchSyncSourceType } from "@prisma/client";

export const MATCH_EXTERNAL_SOURCES = ["manual", "fotball-no"] as const;
export type MatchExternalSource = (typeof MATCH_EXTERNAL_SOURCES)[number];

export const MATCH_STATUSES = [
  "scheduled",
  "postponed",
  "cancelled",
  "finished",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type MatchSyncSettingsDto = {
  id: string;
  enabled: boolean;
  clubName: string | null;
  clubId: string | null;
  teamIds: string[];
  sourceType: MatchSyncSourceType;
  importMode: MatchSyncImportMode;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
};

export type MatchSyncSummary = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type ProviderMatch = {
  externalId: string;
  externalTeamId?: string | null;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  league?: string | null;
  venue?: string | null;
  isHomeMatch: boolean;
  status: MatchStatus;
  sourceUrl?: string | null;
};

export type MatchProvider = {
  sourceType: MatchSyncSourceType;
  fetchMatches(input: {
    clubId?: string | null;
    teamIds?: string[];
  }): Promise<ProviderMatch[]>;
};
