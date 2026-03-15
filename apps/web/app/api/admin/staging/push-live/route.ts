import { deniedAccess, requireSuperAdmin } from "../../auth";
import { proxyAdminJson } from "../../upstream";

export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) {
    return deniedAccess("Access denied: only superadmins can push staging to live.");
  }

  return proxyAdminJson("/admin/staging/push-to-live", {
    method: "POST",
    request,
    errorMessage: "Unable to push staging to live.",
    includeJsonContentType: false,
  });
}
