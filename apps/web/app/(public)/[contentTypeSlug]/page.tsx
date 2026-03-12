import { notFound } from "next/navigation";
import Link from "next/link";

import {
  getContentTypeArchiveItems,
  getPublicContentTypeBySlug,
} from "../../../lib/content";
import { resolveContentTypeTemplate } from "../templates/template-registry";

export default async function ContentTypeArchivePage({
  params,
}: {
  params: Promise<{ contentTypeSlug: string }>;
}) {
  const { contentTypeSlug } = await params;
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
