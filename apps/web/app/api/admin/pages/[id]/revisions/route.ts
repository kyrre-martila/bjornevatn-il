import { requireMinimumAdminRole } from "../../../auth";
import { proxyAdminJson } from "../../../upstream";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) return denied;

  const { id } = await params;
  return proxyAdminJson(`/admin/content/pages/${encodeURIComponent(id)}/revisions`, {
    method: "GET",
    errorMessage: "Failed to load page revisions",
  });
}
