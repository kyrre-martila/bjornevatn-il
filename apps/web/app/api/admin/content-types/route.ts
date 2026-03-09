import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "../utils";

export async function GET() {
  const res = await fetch(`${getApiBase()}/content/types`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load content types" }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${getApiBase()}/content/types`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to create content type" }, { status: res.status });
  }

  return NextResponse.json(data);
}
