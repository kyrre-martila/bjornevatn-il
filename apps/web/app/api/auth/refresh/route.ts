import { NextResponse } from "next/server";

/**
 * Refresh-token rotation is intentionally not part of the current auth model.
 * Clients must re-authenticate when access tokens expire.
 */
export async function POST(): Promise<Response> {
  return NextResponse.json(
    {
      error: "Refresh tokens are not supported. Re-authenticate via /auth/login.",
    },
    { status: 410 },
  );
}
