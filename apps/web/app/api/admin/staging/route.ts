import { deniedAccess, requireSuperAdmin } from "../auth";
import { proxyAdminJson } from "../upstream";

export async function DELETE(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) {
    return deniedAccess("Access denied: only superadmins can delete staging.");
  }

  return proxyAdminJson("/admin/staging", {
    method: "DELETE",
    request,
    errorMessage: "Unable to delete staging.",
    includeJsonContentType: false,
  });
}
