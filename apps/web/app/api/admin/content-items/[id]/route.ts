import { requireMinimumAdminRole } from "../../auth";
import { proxyAdminJson } from "../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    request,
    errorMessage: "Failed to update content item",
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
    errorMessage: "Failed to delete content item",
  });
}
