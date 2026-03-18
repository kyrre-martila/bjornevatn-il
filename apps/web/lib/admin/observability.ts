import { cookies } from "next/headers";

export type ObservabilityRange = "today" | "last7Days" | "last30Days";

export type AdminOperationalEvent = {
  id: string;
  eventType: string;
  severity: "info" | "warn" | "error";
  actorId: string | null;
  actorRole: string | null;
  actorType: string | null;
  route: string | null;
  module: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminMatchSyncRun = {
  id: string;
  provider: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  failureReason: string | null;
};

export type AdminObservabilityDashboard = {
  range: ObservabilityRange;
  startAt: string;
  recentEvents: AdminOperationalEvent[];
  recentRateLimitEvents: AdminOperationalEvent[];
  recentTicketScanConflicts: AdminOperationalEvent[];
  recentPublicSubmissionFailures: AdminOperationalEvent[];
  recentSyncRuns: AdminMatchSyncRun[];
  counts: {
    bookingsSubmitted: number;
    membershipsSubmitted: number;
    ticketOrdersCreated: number;
    scanConflicts: number;
    matchSyncFailures: number;
  };
  trends: {
    failedBookingsByDay: Array<{ date: string; count: number }>;
    rateLimitHitsByEndpoint: Array<{ endpoint: string; count: number }>;
    scanConflictsByDay: Array<{ date: string; count: number }>;
    syncFailuresByProvider: Array<{ provider: string; count: number }>;
  };
};

function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return `${api}${normalizedBase}`;
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};
  if (cookieHeader) headers.cookie = cookieHeader;
  return headers;
}

export async function getAdminObservabilityDashboard(
  range: ObservabilityRange,
): Promise<AdminObservabilityDashboard | null> {
  const response = await fetch(
    `${getApiBase()}/admin/observability?range=${range}`,
    {
      cache: "no-store",
      headers: buildHeaders(),
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AdminObservabilityDashboard;
}
