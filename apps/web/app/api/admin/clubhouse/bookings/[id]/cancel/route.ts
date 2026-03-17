import { NextResponse } from "next/server";

import { requireMinimumAdminRole } from "../../../../auth";
import { buildForwardHeaders, getApiBase } from "../../../../utils";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const res = await fetch(`${getApiBase()}/clubhouse/admin/bookings/${params.id}/cancel`, {
    method: "POST",
    headers: buildForwardHeaders(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to cancel booking" }, { status: res.status });
  }

  return NextResponse.json(data);
}
