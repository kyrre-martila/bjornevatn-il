import { deniedAccess, requireSuperAdmin } from "../../auth";
import { proxyAdminJson } from "../../upstream";

export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) {
    return deniedAccess("Access denied: only super admins can reset staging from live.");
  }

  return proxyAdminJson("/admin/staging/reset-from-live", {
    method: "POST",
    request,
    errorMessage: "Unable to reset staging from live.",
    includeJsonContentType: false,
  });
}
