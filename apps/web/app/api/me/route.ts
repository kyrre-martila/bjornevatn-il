import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return `${api}${normalizedBase}`;
}

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  return headers;
}

export async function GET() {
  const base = getApiBase();
  const headers = buildHeaders();

  const res = await fetch(`${base}/me`, {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const base = getApiBase();
  const headers = buildHeaders();
  headers["content-type"] = "application/json";

  const body = await request.text();

  const res = await fetch(`${base}/me`, {
    method: "PATCH",
    headers,
    body,
  });

  if (!res.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore
    }
    return NextResponse.json(
      errorBody ?? { error: "Failed to update profile" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
