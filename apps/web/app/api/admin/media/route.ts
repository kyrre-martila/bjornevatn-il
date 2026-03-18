import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) {
    return denied;
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");
  const cursor = searchParams.get("cursor");
  const mimeType = searchParams.get("mimeType");
  const uploadedAfter = searchParams.get("uploadedAfter");
  const uploadedBefore = searchParams.get("uploadedBefore");
  const search = searchParams.get("search");
  const upstreamParams = new URLSearchParams();
  if (page) upstreamParams.set("page", page);
  if (pageSize) upstreamParams.set("pageSize", pageSize);
  if (cursor) upstreamParams.set("cursor", cursor);
  if (mimeType) upstreamParams.set("mimeType", mimeType);
  if (uploadedAfter) upstreamParams.set("uploadedAfter", uploadedAfter);
  if (uploadedBefore) upstreamParams.set("uploadedBefore", uploadedBefore);
  if (search) upstreamParams.set("search", search);
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
