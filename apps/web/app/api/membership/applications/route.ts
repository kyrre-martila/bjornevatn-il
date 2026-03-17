import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "../../admin/utils";

export async function POST(request: Request) {
  const res = await fetch(`${getApiBase()}/membership/applications`, {
    method: "POST",
    headers: buildForwardHeaders(true),
    body: await request.text(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { message: "Failed to submit membership application." }, { status: res.status });
  }

  return NextResponse.json(data);
}
