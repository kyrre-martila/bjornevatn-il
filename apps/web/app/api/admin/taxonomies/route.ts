import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../auth";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET() {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const res = await fetch(`${getApiBase()}/admin/content/taxonomies`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load taxonomies" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole();
  if (denied) return denied;

  const body = await request.text();
  const res = await fetch(`${getApiBase()}/admin/content/taxonomies`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to create taxonomy" }, {
      status: res.status,
    });
  }

  return NextResponse.json(data);
}
