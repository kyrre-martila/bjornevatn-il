import { NextResponse } from "next/server";

import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

const DEFAULT_REDIRECTS_LIMIT = 50;
const MAX_REDIRECTS_LIMIT = 100;

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit"));
  const rawOffset = Number(url.searchParams.get("offset"));

  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_REDIRECTS_LIMIT, Math.max(1, rawLimit))
    : DEFAULT_REDIRECTS_LIMIT;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, rawOffset) : 0;

  const query = new URLSearchParams();
  query.set("limit", String(limit));

  const cursor = url.searchParams.get("cursor")?.trim();
  if (cursor) {
    query.set("cursor", cursor);
  } else {
    query.set("offset", String(offset));
  }

  const res = await fetch(`${getApiBase()}/admin/redirects?${query.toString()}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load redirects" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole("admin");
  if (denied) return denied;

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/admin/redirects`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to create redirect" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
