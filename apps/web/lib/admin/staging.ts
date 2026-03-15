import { cookies } from "next/headers";

export type StagingState = "active" | "syncing" | "deleted";

export type StagingStatus = {
  environment: "staging";
  state: StagingState;
  lastSyncedAt: string | null;
  lastPushedAt: string | null;
  lastResetAt: string | null;
  lockStatus: "idle" | "locked";
  lastActorUserId: string | null;
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

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  return headers;
}

export async function getAdminStagingStatus(): Promise<StagingStatus | null> {
  const response = await fetch(`${getApiBase()}/admin/staging/status`, {
    headers: buildHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as StagingStatus;
}
