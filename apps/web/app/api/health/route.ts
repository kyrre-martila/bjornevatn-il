import { createHealthProbeUrl } from "../../../lib/api";
import { NextRequest, NextResponse } from "next/server";

function parseBooleanFlag(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function resolveReadinessRequested(req: NextRequest): boolean {
  const queryMode = req.nextUrl.searchParams.get("mode");
  if (queryMode?.trim().toLowerCase() === "ready") {
    return true;
  }

  return parseBooleanFlag(req.nextUrl.searchParams.get("ready"));
}

export async function GET(req: NextRequest) {
  const readinessRequested = resolveReadinessRequested(req);

  if (!readinessRequested) {
    return NextResponse.json({ ok: true, service: "web", check: "live" });
  }

  const healthUrl = createHealthProbeUrl();

  try {
    const upstream = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-blueprint-probe": "web-readiness",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          service: "web",
          check: "ready",
          dependencies: {
            api: "down",
          },
          upstreamStatus: upstream.status,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      service: "web",
      check: "ready",
      dependencies: {
        api: "up",
      },
      upstreamStatus: upstream.status,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "web",
        check: "ready",
        dependencies: {
          api: "down",
        },
        reason: "API health probe failed",
      },
      { status: 503 },
    );
  }
}
