import { requireMinimumAdminRole, requireSuperAdmin } from "../auth";
import { proxyAdminJson } from "../upstream";

export async function GET() {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  return proxyAdminJson("/admin/content/taxonomies", {
    method: "GET",
    cache: "no-store",
    errorMessage: "Failed to load taxonomies",
  });
}

export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  return proxyAdminJson("/admin/content/taxonomies", {
    method: "POST",
    request,
    errorMessage: "Failed to create taxonomy",
  });
}
