import { proxyAdminJson } from "../upstream";
import { requireMinimumAdminRole } from "../auth";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const url = new URL(request.url);
  return proxyAdminJson("/membership/admin/applications", {
    request,
    query: url.searchParams,
    errorMessage: "Failed to load membership applications.",
    includeJsonContentType: false,
    cache: "no-store",
  });
}
