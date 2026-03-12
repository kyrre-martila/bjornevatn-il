import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../../auth";
import { buildForwardHeaders, getApiBase } from "../../utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  const res = await fetch(
    `${getApiBase()}/admin/content/terms/${encodeURIComponent(id)}`,
    {
      headers: buildForwardHeaders(),
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load term" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.text();
  const res = await fetch(
    `${getApiBase()}/admin/content/terms/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: buildForwardHeaders(true),
      body,
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to update term" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  const res = await fetch(
    `${getApiBase()}/admin/content/terms/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: buildForwardHeaders(true),
    },
  );

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: "Failed to delete term" }, {
      status: res.status,
    });
  }

  return new NextResponse(null, { status: 204 });
}
