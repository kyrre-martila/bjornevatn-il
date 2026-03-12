import { NextResponse } from "next/server";

/**
 * Magic-link callbacks are not enabled in the current auth lifecycle.
 * Keep this route to avoid silent 404s and send users back to password login.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const destination = new URL("/login", url.origin);
  destination.searchParams.set("reason", "magic-link-not-enabled");
  return NextResponse.redirect(destination);
}
