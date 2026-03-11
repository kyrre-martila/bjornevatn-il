import { NextResponse } from "next/server";
import { hasMinimumRole, hasRole, type UserRole } from "../../../lib/rbac";
import { buildForwardHeaders, getApiBase } from "./utils";

type MeResponse = {
  user?: {
    role?: string;
  };
};

function deniedResponse(status: number) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Access denied" },
    { status },
  );
}

async function fetchCurrentRole(): Promise<{ role?: string; denied: NextResponse | null }> {
  const res = await fetch(`${getApiBase()}/me`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    return { denied: deniedResponse(401) };
  }

  const data = (await res.json().catch(() => null)) as MeResponse | null;
  return { role: data?.user?.role, denied: null };
}

export async function requireMinimumAdminRole(
  minimumRole: UserRole = "editor",
): Promise<NextResponse | null> {
  const { role, denied } = await fetchCurrentRole();
  if (denied) return denied;

  if (!hasMinimumRole(role, minimumRole)) {
    return deniedResponse(403);
  }

  return null;
}

export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const { role, denied } = await fetchCurrentRole();
  if (denied) return denied;

  if (!hasRole(role, "super_admin")) {
    return deniedResponse(403);
  }

  return null;
}
