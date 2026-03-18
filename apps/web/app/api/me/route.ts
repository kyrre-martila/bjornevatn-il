import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerApiBaseUrl } from "../../../lib/api-config";

function buildHeaders() {
  const cookieHeader = cookies().toString();
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  return headers;
}

export async function GET() {
  const headers = buildHeaders();

  const res = await fetch(`${getServerApiBaseUrl()}/me`, {
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
