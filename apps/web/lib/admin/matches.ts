import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

export type MatchSyncSettings = {
  enabled: boolean;
  clubName: string | null;
  clubId: string | null;
  teamIds: string[];
  sourceType: "fotball_no" | "ical";
  importMode: "create_only" | "create_and_update";
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

export type AdminMatchPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type AdminMatchListResponse = {
  items: AdminMatchRow[];
  pagination: AdminMatchPagination;
  filters?: Record<string, unknown>;
};

export type AdminMatchRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  venue: string;
  externalSource: string;
  status: string;
  ticketSalesEnabled: boolean;
  lastSyncedAt: string | null;
};

function getApiBase() {
  return getServerApiBaseUrl();
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookieHeader) headers.cookie = cookieHeader;
  return headers;
}

export async function getMatchSyncSettings(): Promise<MatchSyncSettings | null> {
  const response = await fetch(`${getApiBase()}/matches/admin/settings`, {
    cache: "no-store",
    headers: buildHeaders(),
  });
  if (!response.ok) return null;
  return (await response.json()) as MatchSyncSettings;
}

export async function saveMatchSyncSettings(payload: Record<string, unknown>) {
  const response = await fetch(`${getApiBase()}/matches/admin/settings`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return response.ok;
}

export async function runMatchSync(): Promise<MatchSyncSummary | null> {
  const response = await fetch(`${getApiBase()}/matches/admin/sync`, {
    method: "POST",
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return (await response.json()) as MatchSyncSummary;
}

export async function listAdminMatches(query: {
  source?: string;
  upcoming?: "upcoming" | "past";
  ticketSalesEnabled?: "true" | "false";
  page?: number;
  pageSize?: number;
}): Promise<AdminMatchListResponse> {
  const params = new URLSearchParams();
  if (query.source) params.set("source", query.source);
  if (query.upcoming) params.set("upcoming", query.upcoming);
  if (query.ticketSalesEnabled) {
    params.set("ticketSalesEnabled", query.ticketSalesEnabled);
  }
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const response = await fetch(
    `${getApiBase()}/matches/admin?${params.toString()}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );
  if (!response.ok)
    return {
      items: [],
      pagination: {
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 25,
        total: 0,
        totalPages: 1,
      },
    };
  return (await response.json()) as AdminMatchListResponse;
}
