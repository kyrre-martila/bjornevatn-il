import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import {
  getContentItemPath,
  getPublicContentTypeBySlug,
  getSiteConfiguration,
  resolveContentItemBySlug,
  withTitleSuffix,
} from "../../../../lib/content";
import { buildJsonLd, buildMetadata } from "../../../../lib/seo";
import { resolveContentTypeTemplate } from "../../templates/template-registry";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contentTypeSlug: string; slug: string }>;
}): Promise<Metadata> {
  const { contentTypeSlug, slug } = await params;
  const [resolved, siteConfig] = await Promise.all([
    resolveContentItemBySlug(contentTypeSlug, slug),
    getSiteConfiguration(),
  ]);

  if (resolved.redirect) {
    return { title: "Redirecting" };
  }

  const item = resolved.item;
  if (!item) {
    return { title: "Not found" };
  }

  const fallbackPath =
    getContentItemPath(contentTypeSlug, item.slug) ?? `/${contentTypeSlug}`;

  if (contentTypeSlug === "match") {
    const match = asRecord(item.data);
    const home = String(match.homeTeam ?? "").trim();
    const away = String(match.awayTeam ?? "").trim();
    const date = String(match.matchDate ?? "").trim();
    const title = withTitleSuffix(`${home} vs ${away} · ${date}`, siteConfig.defaultTitleSuffix);

    return buildMetadata({
      pageTitle: title,
      pageDescription: item.summary,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      seoImage: item.seoImage,
      seoCanonicalUrl: item.canonicalUrl,
      seoNoIndex: item.noIndex,
      path: fallbackPath,
    });
  }

  return buildMetadata({
    pageTitle: item.title,
    pageDescription: item.summary,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    seoImage: item.seoImage,
    seoCanonicalUrl: item.canonicalUrl,
    seoNoIndex: item.noIndex,
    path: fallbackPath,
    ogType: contentTypeSlug === "news" ? "article" : "website",
  });
}

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ contentTypeSlug: string; slug: string }>;
}) {
  const { contentTypeSlug, slug } = await params;
  const [resolved, contentType] = await Promise.all([
    resolveContentItemBySlug(contentTypeSlug, slug),
    getPublicContentTypeBySlug(contentTypeSlug),
  ]);

  if (!contentType) {
    notFound();
  }

  if (resolved.redirect) {
    if (resolved.redirect.permanent) {
      permanentRedirect(resolved.redirect.target);
    }

    redirect(resolved.redirect.target);
  }

  const item = resolved.item;
  if (!item) {
    notFound();
  }

  const Template = resolveContentTypeTemplate(
    item.templateKey || contentType.templateKey,
  );

  const matchData = contentTypeSlug === "match" ? asRecord(item.data) : null;
  const sportsEventJsonLd =
    matchData
      ? buildJsonLd({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${String(matchData.homeTeam ?? "")} vs ${String(matchData.awayTeam ?? "")}`.trim(),
          startDate: String(matchData.matchDate ?? ""),
          location: {
            "@type": "Place",
            name: String(matchData.venue ?? ""),
          },
          competitor: [
            { "@type": "SportsTeam", name: String(matchData.homeTeam ?? "") },
            { "@type": "SportsTeam", name: String(matchData.awayTeam ?? "") },
          ],
        })
      : null;

  return (
    <Template title={item.title} meta={item.publishedAt}>
      {sportsEventJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: sportsEventJsonLd }} />
      ) : null}
      {item.body ? <p>{item.body}</p> : <p>{item.summary}</p>}
    </Template>
  );
}
