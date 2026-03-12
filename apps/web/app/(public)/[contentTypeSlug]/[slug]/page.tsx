import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import {
  getContentItemPath,
  getPublicContentTypeBySlug,
  getSiteConfiguration,
  resolveContentItemBySlug,
  withTitleSuffix,
} from "../../../../lib/content";
import { resolveContentTypeTemplate } from "../../templates/template-registry";

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

  const canonicalUrl = new URL(
    getContentItemPath(contentTypeSlug, item.slug) ?? `/${contentTypeSlug}`,
    `${siteConfig.siteUrl}/`,
  ).toString();
  const title = withTitleSuffix(item.title, siteConfig.defaultTitleSuffix);

  return {
    title,
    description: item.summary,
    alternates: { canonical: canonicalUrl },
    robots: item.noIndex ? { index: false, follow: true } : undefined,
  };
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
    // Honor API semantics while keeping redirect targets constrained to internal paths.
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

  return (
    <Template title={item.title} meta={item.publishedAt}>
      {item.body ? <p>{item.body}</p> : <p>{item.summary}</p>}
    </Template>
  );
}
