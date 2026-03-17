import { proxyAdminJson } from "../../upstream";
import { requireMinimumAdminRole } from "../../auth";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  return proxyAdminJson(`/membership/admin/applications/${params.id}`, {
    method: "PATCH",
    request,
    errorMessage: "Failed to update membership application.",
  });
}
