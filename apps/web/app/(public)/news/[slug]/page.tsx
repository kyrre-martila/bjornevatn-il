import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { resolveNewsItemBySlug } from "../../../../lib/content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveNewsItemBySlug(slug);

  if (resolved.redirectTo) {
    return { title: "Redirecting" };
  }

  const item = resolved.item;

  if (!item) {
    return { title: "Not found" };
  }

  return {
    title: item.title,
    description: item.summary,
    alternates: item.canonicalUrl ? { canonical: item.canonicalUrl } : undefined,
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

  return (
    <article className="public-block section stack">
      <p className="news-list__meta">{item.publishedAt}</p>
      <h1 className="public-block__title">{item.title}</h1>
      {item.body ? <p>{item.body}</p> : <p>{item.summary}</p>}
    </article>
  );
}
