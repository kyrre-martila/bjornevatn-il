import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../../auth";
import { buildForwardHeaders, getApiBase } from "../../utils";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) {
    return denied;
  }

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/admin/media/${params.id}`, {
    method: "PATCH",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to update media" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) {
    return denied;
  }

  const res = await fetch(`${getApiBase()}/admin/media/${params.id}`, {
    method: "DELETE",
    headers: buildForwardHeaders(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to delete media" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data ?? { ok: true });
}
