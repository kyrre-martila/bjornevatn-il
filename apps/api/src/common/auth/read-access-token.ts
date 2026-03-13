import type { Request } from "express";

export function readAccessToken(req: Request): string | null {
  const fromCookie = req.cookies?.access as string | undefined;
  if (fromCookie?.trim()) {
    return fromCookie.trim();
  }

  const header = req.headers.authorization;
  if (!header) {
    return null;
  }

  return header.replace(/^Bearer\s+/i, "").trim() || null;
}
