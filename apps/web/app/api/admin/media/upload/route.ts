import { NextResponse } from "next/server";
import { requireMinimumAdminRole } from "../../auth";
import { buildForwardHeaders, getApiBase } from "../../utils";

export async function POST(request: Request) {
  const denied = await requireMinimumAdminRole("editor");
  if (denied) {
    return denied;
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  const altText = incoming.get("altText");
  const caption = incoming.get("caption");

  if (!(file instanceof File) || typeof altText !== "string") {
    return NextResponse.json({ error: "file and altText are required" }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.set("file", file, file.name);
  outbound.set("altText", altText);
  if (typeof caption === "string" && caption.trim()) {
    outbound.set("caption", caption.trim());
  }

  const headers = buildForwardHeaders();
  delete headers["content-type"];

  const res = await fetch(`${getApiBase()}/admin/media/upload`, {
    method: "POST",
    headers,
    body: outbound,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(data ?? { error: "Failed to upload media" }, { status: res.status });
  }

  return NextResponse.json(data);
}
