import { requireMinimumAdminRole, requireSuperAdmin } from "../auth";
import { proxyAdminJson } from "../upstream";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const query = new URLSearchParams();
  const taxonomyId = searchParams.get("taxonomyId");
  if (taxonomyId) query.set("taxonomyId", taxonomyId);

  return proxyAdminJson("/admin/content/terms", {
    method: "GET",
    query,
    cache: "no-store",
    errorMessage: "Failed to load terms",
  });
}

export async function POST(request: Request) {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  return proxyAdminJson("/admin/content/terms", {
    method: "POST",
    request,
    errorMessage: "Failed to create term",
  });
}
