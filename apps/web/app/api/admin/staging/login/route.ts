import { requireMinimumAdminRole } from "../../auth";
import { proxyAdminJson } from "../../upstream";

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  return proxyAdminJson("/admin/staging/login", {
    method: "POST",
    request,
    errorMessage: "Unable to authorize staging login.",
    includeJsonContentType: false,
  });
}
