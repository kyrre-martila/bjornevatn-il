import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../api-config";

const DEFAULT_AUDIT_LIMIT = 50;
const MAX_AUDIT_LIMIT = 100;

export type AdminAuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
};

export type AuditPagination = {
  limit: number;
  offset: number;
};

function getApiBase() {
  return getServerApiBaseUrl();
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  return headers;
}

function normalizePagination(limit?: number, offset?: number): AuditPagination {
  return {
    limit:
      typeof limit === "number"
        ? Math.min(MAX_AUDIT_LIMIT, Math.max(1, limit))
        : DEFAULT_AUDIT_LIMIT,
    offset: typeof offset === "number" && offset >= 0 ? offset : 0,
  };
}

export async function listAdminAuditLogs(filters?: {
  userId?: string;
  action?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminAuditLog[]; pagination: AuditPagination }> {
  const pagination = normalizePagination(filters?.limit, filters?.offset);
  const params = new URLSearchParams();
  if (filters?.userId) params.set("userId", filters.userId);
  if (filters?.action) params.set("action", filters.action);
  if (filters?.entityType) params.set("entityType", filters.entityType);
  params.set("limit", String(pagination.limit));
  params.set("offset", String(pagination.offset));

  const response = await fetch(
    `${getApiBase()}/admin/audit-logs?${params.toString()}`,
    {
      headers: buildHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return { items: [], pagination };
  }

  return { items: (await response.json()) as AdminAuditLog[], pagination };
}
