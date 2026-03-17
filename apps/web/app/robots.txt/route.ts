import { NextResponse } from "next/server";

import { getSeoSettings } from "../../lib/seo";

export async function GET() {
  const seo = await getSeoSettings();

  const lines = ["User-agent: *"];

  if (!seo.robotsIndexEnabled) {
    lines.push("Disallow: /");
  } else {
    lines.push("Allow: /");
  }

  lines.push(`Sitemap: ${seo.siteUrl}/sitemap.xml`);

  return new NextResponse(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
