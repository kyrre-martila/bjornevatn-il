import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const contentTypeId = searchParams.get("contentTypeId");
  const mode = searchParams.get("mode");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");

  const path = contentTypeId
    ? `/admin/content/items/type/${encodeURIComponent(contentTypeId)}`
    : "/admin/content/items";

  const upstreamParams = new URLSearchParams();
  if (mode) upstreamParams.set("mode", mode);
  if (limit) upstreamParams.set("limit", limit);
  if (offset) upstreamParams.set("offset", offset);

  const query = upstreamParams.size > 0 ? `?${upstreamParams.toString()}` : "";

  const res = await fetch(`${getApiBase()}${path}${query}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to load content items" },
      { status: res.status },
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/admin/content/items`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      data ?? { error: "Failed to create content item" },
      { status: res.status },
    );
  }

  return NextResponse.json(data);
}
