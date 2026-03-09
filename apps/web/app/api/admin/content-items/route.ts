import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contentTypeId = searchParams.get("contentTypeId");
  const path = contentTypeId
    ? `/content/items/type/${encodeURIComponent(contentTypeId)}`
    : "/content/items";

  const res = await fetch(`${getApiBase()}${path}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load content items" }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${getApiBase()}/content/items`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to create content item" }, { status: res.status });
  }

  return NextResponse.json(data);
}
