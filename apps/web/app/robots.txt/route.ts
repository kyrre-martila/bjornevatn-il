import { NextResponse } from "next/server";

import { getRobotsSettings, getSiteUrl } from "../../lib/content";

export async function GET() {
  const [baseUrl, settings] = await Promise.all([
    getSiteUrl(),
    getRobotsSettings(),
  ]);

  const lines = ["User-agent: *"];

  if (settings.disallowAll) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
  }

  if (settings.noIndex) {
    lines.push("Noindex: /");
  }

  lines.push(`Sitemap: ${baseUrl}/sitemap.xml`);

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
