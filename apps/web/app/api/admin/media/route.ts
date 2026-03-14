import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) {
    return denied;
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const cursor = searchParams.get("cursor");
  const upstreamParams = new URLSearchParams();
  if (limit) upstreamParams.set("limit", limit);
  if (offset) upstreamParams.set("offset", offset);
  if (cursor) upstreamParams.set("cursor", cursor);
  const query = upstreamParams.size > 0 ? `?${upstreamParams.toString()}` : "";

  const res = await fetch(`${getApiBase()}/admin/media${query}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load media" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
