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

  let res: Response;
  try {
    res = await fetch(`${getServerApiBaseUrl()}/me`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
