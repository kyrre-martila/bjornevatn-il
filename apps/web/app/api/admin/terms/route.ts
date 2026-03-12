import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const taxonomyId = searchParams.get("taxonomyId");
  const path = taxonomyId
    ? `/admin/content/terms?taxonomyId=${encodeURIComponent(taxonomyId)}`
    : "/admin/content/terms";

  const res = await fetch(`${getApiBase()}${path}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load terms" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/admin/content/terms`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to create term" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
