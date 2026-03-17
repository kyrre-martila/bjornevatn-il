import { NextResponse } from "next/server";

import { requireMinimumAdminRole } from "../../../../auth";
import { buildForwardHeaders, getApiBase } from "../../../../utils";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/clubhouse/admin/bookings/${params.id}/admin-notes`, {
    method: "PATCH",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to update admin notes" }, { status: res.status });
  }

  return NextResponse.json(data);
}
