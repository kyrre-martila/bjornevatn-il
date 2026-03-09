import { NextResponse } from "next/server";
import { buildForwardHeaders, getApiBase } from "../../utils";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${getApiBase()}/content/pages/${params.id}`, {
    headers: buildForwardHeaders(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to load page" }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.text();
  const res = await fetch(`${getApiBase()}/content/pages/${params.id}`, {
    method: "PATCH",
    headers: buildForwardHeaders(true),
    body,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to update page" }, { status: res.status });
  }

  return NextResponse.json(data);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${getApiBase()}/content/pages/${params.id}`, {
    method: "DELETE",
    headers: buildForwardHeaders(),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to delete page" }, { status: res.status });
  }

  return NextResponse.json(data ?? { ok: true });
}
