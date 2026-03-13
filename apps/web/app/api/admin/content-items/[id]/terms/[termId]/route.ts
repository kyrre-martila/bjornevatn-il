import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../../../../auth";
import { proxyAdminJson } from "../../../../upstream";

type Params = { params: Promise<{ id: string; termId: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id, termId } = await params;
  const res = await proxyAdminJson(
    `/admin/content/items/${encodeURIComponent(id)}/terms/${encodeURIComponent(termId)}`,
    {
      method: "DELETE",
      errorMessage: "Failed to remove term assignment",
    },
  );

  if (res.ok) {
    return new NextResponse(null, { status: 204 });
  }

  return res;
}
