import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import {
  getSiteConfiguration,
  resolveNewsItemBySlug,
  withTitleSuffix,
} from "../../../../lib/content";
import { resolveContentTypeTemplate } from "../../templates/template-registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [resolved, siteConfig] = await Promise.all([
    resolveNewsItemBySlug(slug),
    getSiteConfiguration(),
  ]);

  if (resolved.redirectTo) {
    return { title: "Redirecting" };
  }

  const item = resolved.item;

  if (!item) {
    return { title: "Not found" };
  }

  const canonicalUrl =
    item.canonicalUrl ?? new URL(`/news/${item.slug}`, `${siteConfig.siteUrl}/`).toString();
  const title = withTitleSuffix(item.title, siteConfig.defaultTitleSuffix);

  return {
    title,
    description: item.summary,
    openGraph: {
      title,
      description: item.summary,
      type: "article",
      url: canonicalUrl,
      images: siteConfig.defaultSeoImage
        ? [{ url: siteConfig.defaultSeoImage }]
        : undefined,
      siteName: siteConfig.siteName,
    },
    alternates: { canonical: canonicalUrl },
    robots: item.noIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function NewsItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolveNewsItemBySlug(slug);

  if (resolved.redirectTo) {
    permanentRedirect(resolved.redirectTo);
  }

  const item = resolved.item;

  if (!item) {
    notFound();
  }

  const Template = resolveContentTypeTemplate(item.templateKey);

  return (
    <Template title={item.title} meta={item.publishedAt}>
      {item.body ? <p>{item.body}</p> : <p>{item.summary}</p>}
    </Template>
  );
}
