import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPageContentBySlug } from "../../../../lib/content";
import { renderBlock } from "./block-renderer";

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
  const page = await getPageContentBySlug(slug);

  if (!page) {
    return {};
  }

  const title = page.seoTitle?.trim() || page.title;
  const description =
    page.seoDescription?.trim() || fallbackDescriptionFromBlocks(page.blocks);

  const openGraph = {
    title,
    description,
    type: "website" as const,
    url: page.canonicalUrl ?? `/page/${page.slug}`,
    images: page.seoImage ? [{ url: page.seoImage }] : undefined,
  };

  return {
    title,
    description: description || undefined,
    openGraph,
    alternates: page.canonicalUrl
      ? { canonical: page.canonicalUrl }
      : undefined,
    robots: page.noIndex ? { index: false, follow: true } : undefined,
  };
}

export default async function GenericPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const content = await getPageContentBySlug(slug);

  if (!content) {
    notFound();
  }

  const renderedBlocks = await Promise.all(
    content.blocks.map(async (block) => ({
      id: block.id,
      node: await renderBlock(block),
    })),
  );

  return (
    <article>
      {renderedBlocks.map((block) => (
        <div key={block.id}>{block.node}</div>
      ))}
    </article>
  );
}
