import { NextResponse, type NextRequest } from "next/server";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const apiOrigin = new URL(api).origin;
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "script-src 'self'",
  "style-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
].join("; ");

const isProduction = process.env.NODE_ENV === "production";
const isCi = process.env.CI === "true" || process.env.PLAYWRIGHT === "true";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  res.headers.set("Content-Security-Policy", csp);

  if (!isProduction) {
    const existingValue = req.cookies.get("XSRF-TOKEN")?.value;
    const fallbackValue = isCi || !isProduction ? "test-csrf-token" : undefined;
    const value = existingValue ?? fallbackValue;

    if (value) {
      res.cookies.set("XSRF-TOKEN", value, {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        path: "/",
      });
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
