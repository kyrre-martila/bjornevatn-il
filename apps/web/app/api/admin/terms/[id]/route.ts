import { requireMinimumAdminRole, requireSuperAdmin } from "../../auth";
import { proxyAdminJson } from "../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/terms/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    errorMessage: "Failed to load term",
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/terms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    request,
    errorMessage: "Failed to update term",
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/terms/${encodeURIComponent(id)}`, {
    method: "DELETE",
    errorMessage: "Failed to delete term",
  });
}
