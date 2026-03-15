import { requireMinimumAdminRole } from "../../auth";
import { proxyAdminJson } from "../../upstream";

export async function GET() {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  return proxyAdminJson("/admin/staging/status", {
    errorMessage: "Unable to fetch staging status.",
    cache: "no-store",
  });
}
