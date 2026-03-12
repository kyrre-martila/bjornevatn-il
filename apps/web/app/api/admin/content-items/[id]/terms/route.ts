import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../../../auth";
import { buildForwardHeaders, getApiBase } from "../../../utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  const res = await fetch(
    `${getApiBase()}/admin/content/items/${encodeURIComponent(id)}/terms`,
    {
      headers: buildForwardHeaders(),
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to load content item terms" },
      { status: res.status },
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.text();
  const res = await fetch(
    `${getApiBase()}/admin/content/items/${encodeURIComponent(id)}/terms`,
    {
      method: "PUT",
      headers: buildForwardHeaders(true),
      body,
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to assign terms" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
