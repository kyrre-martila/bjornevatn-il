import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET() {
  const denied = await requireMinimumAdminRole();
  if (denied) {
    return denied;
  }

  const res = await fetch(`${getApiBase()}/media`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load media" }, { status: res.status });
  }

  return NextResponse.json(data);
}
