import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";

import {
  getContentTypeArchiveItems,
  getPublicContentTypeBySlug,
  resolvePageContentBySlug,
} from "../../../lib/content";
import { renderBlock } from "../page/[slug]/block-renderer";
import {
  resolveContentTypeTemplate,
  resolvePageTemplate,
} from "../templates/template-registry";

export default async function ContentTypeArchivePage({
  params,
}: {
  params: Promise<{ contentTypeSlug: string }>;
}) {
  const { contentTypeSlug } = await params;
  const pageResolution = await resolvePageContentBySlug(contentTypeSlug);

  if (pageResolution.redirectTo) {
    permanentRedirect(pageResolution.redirectTo);
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

  const items = await getContentTypeArchiveItems(contentTypeSlug);
  const Template = resolveContentTypeTemplate(contentType.templateKey);

  return (
    <Template title={contentType.name}>
      <section className="public-block public-block--news-page section stack">
        <h1 className="public-block__title">{contentType.name}</h1>
        <ul className="news-list news-list--page stack">
          {items.map((item) => (
            <li key={item.slug} className="news-list__item stack">
              <p className="news-list__meta">{item.publishedAt}</p>
              <h2 className="news-list__title">{item.title}</h2>
              <p className="news-list__excerpt">{item.summary}</p>
              <Link
                href={`/${contentTypeSlug}/${item.slug}`}
                className="news-list__link"
              >
                Read more
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Template>
  );
}
