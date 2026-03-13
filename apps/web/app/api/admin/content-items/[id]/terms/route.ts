import { requireMinimumAdminRole } from "../../../auth";
import { proxyAdminJson } from "../../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/items/${encodeURIComponent(id)}/terms`, {
    method: "GET",
    cache: "no-store",
    errorMessage: "Failed to load content item terms",
  });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/items/${encodeURIComponent(id)}/terms`, {
    method: "PUT",
    request,
    errorMessage: "Failed to assign terms",
  });
}
