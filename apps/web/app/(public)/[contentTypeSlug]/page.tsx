import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import Link from "next/link";

import {
  getContentTypeArchiveItems,
  getContentItemPath,
  getPagePath,
  getPublicContentTypeBySlug,
  resolvePageContentBySlug,
} from "../../../lib/content";
import { buildMetadata } from "../../../lib/seo";
import { renderBlock } from "../page/[slug]/block-renderer";
import {
  resolveContentTypeTemplate,
  resolvePageTemplate,
} from "../templates/template-registry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contentTypeSlug: string }>;
}): Promise<Metadata> {
  const { contentTypeSlug } = await params;
  const [pageResolution, contentType] = await Promise.all([
    resolvePageContentBySlug(contentTypeSlug),
    getPublicContentTypeBySlug(contentTypeSlug),
  ]);

  if (pageResolution.page) {
    const page = pageResolution.page;
    const pagePath = getPagePath(page.slug) ?? `/${contentTypeSlug}`;

    return buildMetadata({
      pageTitle: page.title,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoImage: page.seoImage,
      seoCanonicalUrl: page.canonicalUrl,
      seoNoIndex: page.noIndex,
      path: pagePath,
    });
  }

  if (!contentType) {
    return {};
  }

  return buildMetadata({
    pageTitle: contentType.name,
    path: `/${contentType.slug}`,
  });
}

export default async function ContentTypeArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ contentTypeSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { contentTypeSlug } = await params;
  const pageResolution = await resolvePageContentBySlug(contentTypeSlug);

  if (pageResolution.redirect) {
    // Honor API semantics while keeping redirect targets constrained to internal paths.
    if (pageResolution.redirect.permanent) {
      permanentRedirect(pageResolution.redirect.target);
    }

    redirect(pageResolution.redirect.target);
  }

  if (pageResolution.page) {
    const page = pageResolution.page;
    const renderedBlocks = await Promise.all(
      page.blocks.map(async (block) => ({
        id: block.id,
        node: await renderBlock(block, { pageTitle: page.title }),
      })),
    );

    const Template = resolvePageTemplate(page.templateKey);

    return (
      <Template title={page.title}>
        {renderedBlocks.map((block) => (
          <div key={block.id}>{block.node}</div>
        ))}
      </Template>
    );
  }

  const contentType = await getPublicContentTypeBySlug(contentTypeSlug);

  if (!contentType) {
    notFound();
  }

  const { page: rawPage } = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);
  const PAGE_SIZE = 20;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const items = await getContentTypeArchiveItems(contentTypeSlug, {
    offset,
    limit: PAGE_SIZE + 1,
  });

  const hasNextPage = items.length > PAGE_SIZE;
  const visibleItems = hasNextPage ? items.slice(0, PAGE_SIZE) : items;
  const Template = resolveContentTypeTemplate(contentType.templateKey);

  return (
    <Template title={contentType.name}>
      <section className="public-block public-block--news-page section stack">
        <h1 className="public-block__title">{contentType.name}</h1>
        <ul className="news-list news-list--page stack">
          {visibleItems.map((item) => (
            <li key={item.slug} className="news-list__item stack">
              <p className="news-list__meta">{item.publishedAt}</p>
              <h2 className="news-list__title">{item.title}</h2>
              <p className="news-list__excerpt">{item.summary}</p>
              <Link
                href={
                  getContentItemPath(contentTypeSlug, item.slug) ??
                  `/${contentTypeSlug}/${item.slug}`
                }
                className="news-list__link"
              >
                Read more
              </Link>
            </li>
          ))}
        </ul>
        <nav
          aria-label="Archive pagination"
          className="stack"
          style={{ marginTop: "1rem" }}
        >
          {currentPage > 1 ? (
            <Link
              href={`/${contentTypeSlug}?page=${currentPage - 1}`}
              className="news-list__link"
            >
              Previous page
            </Link>
          ) : null}
          {hasNextPage ? (
            <Link
              href={`/${contentTypeSlug}?page=${currentPage + 1}`}
              className="news-list__link"
            >
              Next page
            </Link>
          ) : null}
        </nav>
      </section>
    </Template>
  );
}
