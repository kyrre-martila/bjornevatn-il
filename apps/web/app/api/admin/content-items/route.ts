import { requireMinimumAdminRole } from "../auth";
import { proxyAdminJson } from "../upstream";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const contentTypeId = searchParams.get("contentTypeId");
  const path = contentTypeId
    ? `/admin/content/items/type/${encodeURIComponent(contentTypeId)}`
    : "/admin/content/items";

  const query = new URLSearchParams();
  for (const key of ["mode", "limit", "offset"]) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }

  return proxyAdminJson(path, {
    method: "GET",
    query,
    cache: "no-store",
    errorMessage: "Failed to load content items",
  });
}

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  return proxyAdminJson("/admin/content/items", {
    method: "POST",
    request,
    errorMessage: "Failed to create content item",
  });
}
