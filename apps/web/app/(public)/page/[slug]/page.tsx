import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import {
  getPagePath,
  getSiteConfiguration,
  resolvePageContentBySlug,
  withTitleSuffix,
} from "../../../../lib/content";
import { renderBlock } from "./block-renderer";
import { resolvePageTemplate } from "../../templates/template-registry";

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackDescriptionFromBlocks(
  blocks: Array<{ data: Record<string, unknown> }>,
): string {
  for (const block of blocks) {
    for (const value of Object.values(block.data)) {
      if (typeof value === "string") {
        const text = stripHtml(value);
        if (text) {
          return text.slice(0, 160);
        }
      }
    }
  }

  return "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [resolved, siteConfig] = await Promise.all([
    resolvePageContentBySlug(slug),
    getSiteConfiguration(),
  ]);

  if (resolved.redirect) {
    return {};
  }

  const page = resolved.page;

  if (!page) {
    return {};
  }

  const basePath = getPagePath(page.slug) ?? "/";
  const canonicalUrl = new URL(basePath, `${siteConfig.siteUrl}/`).toString();
  const title = withTitleSuffix(
    page.seoTitle?.trim() || page.title,
    siteConfig.defaultTitleSuffix,
  );
  const description =
    page.seoDescription?.trim() || fallbackDescriptionFromBlocks(page.blocks);
  const ogImage = page.seoImage || siteConfig.defaultSeoImage;

  const openGraph = {
    title,
    description,
    type: "website" as const,
    url: canonicalUrl,
    images: ogImage ? [{ url: ogImage }] : undefined,
    siteName: siteConfig.siteName,
  };

  return {
    title,
    description: description || undefined,
    openGraph,
    alternates: { canonical: canonicalUrl },
    robots: page.noIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolvePageContentBySlug(slug);

  if (resolved.redirect) {
    // Honor API semantics while keeping redirect targets constrained to internal paths.
    if (resolved.redirect.permanent) {
      permanentRedirect(resolved.redirect.target);
    }

    redirect(resolved.redirect.target);
  }

  const content = resolved.page;

  if (!content) {
    notFound();
  }

  const canonicalPath = getPagePath(content.slug);
  if (canonicalPath) {
    permanentRedirect(canonicalPath);
  }

  const renderedBlocks = await Promise.all(
    content.blocks.map(async (block) => ({
      id: block.id,
      node: await renderBlock(block, { pageTitle: content.title }),
    })),
  );

  const Template = resolvePageTemplate(content.templateKey);

  return (
    <Template title={content.title}>
      {renderedBlocks.map((block) => (
        <div key={block.id}>{block.node}</div>
      ))}
    </Template>
  );
}
