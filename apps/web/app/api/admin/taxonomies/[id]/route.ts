import { requireMinimumAdminRole, requireSuperAdmin } from "../../auth";
import { proxyAdminJson } from "../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/taxonomies/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    errorMessage: "Failed to load taxonomy",
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/taxonomies/${encodeURIComponent(id)}`, {
    method: "PATCH",
    request,
    errorMessage: "Failed to update taxonomy",
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/taxonomies/${encodeURIComponent(id)}`, {
    method: "DELETE",
    errorMessage: "Failed to delete taxonomy",
  });
}
