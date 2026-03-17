import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "../../admin/utils";

export async function POST(request: Request) {
  const res = await fetch(`${getApiBase()}/clubhouse/bookings`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body: await request.text(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { message: "Failed to create booking." }, { status: res.status });
  }

  return NextResponse.json(data);
}
