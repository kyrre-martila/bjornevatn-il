import { notFound } from "next/navigation";

import { getPageContentBySlug } from "../../../../lib/content";

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

  return (
    <article>
      <h1 className="public-page__title">{content.title}</h1>
      <p className="public-page__intro">{content.intro}</p>
      <div className="public-page__body">
        {content.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}
