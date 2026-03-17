import { NextResponse } from "next/server";

import { requireMinimumAdminRole } from "../../auth";
import { buildForwardHeaders, getApiBase } from "../../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const url = new URL(request.url);
  const res = await fetch(`${getApiBase()}/clubhouse/admin/bookings?${url.searchParams.toString()}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load bookings" }, { status: res.status });
  }

  return NextResponse.json(data);
}
