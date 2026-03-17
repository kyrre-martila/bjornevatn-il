import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getClubNewsBySlug } from "../../../../lib/content";
import { buildJsonLd, buildMetadata } from "../../../../lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const news = await getClubNewsBySlug(slug);
  if (!news) return {};

  return buildMetadata({
    pageTitle: news.title,
    pageDescription: news.seoDescription ?? news.excerpt,
    seoTitle: news.seoTitle,
    seoDescription: news.seoDescription,
    seoImage: news.seoImage ?? news.image,
    seoCanonicalUrl: news.seoCanonicalUrl,
    seoNoIndex: news.seoNoIndex,
    path: `/news/${news.slug}`,
    ogType: "article",
  });
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getClubNewsBySlug(slug);

  if (!news) {
    notFound();
  }

  const jsonLd = buildJsonLd({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.seoTitle || news.title,
    datePublished: news.publishedAt,
    image: news.seoImage || news.image || undefined,
    author: { "@type": "Person", name: news.authorName || "Bjørnevatn IL" },
  });

  return (
    <article className="stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <h1>{news.title}</h1>
      {news.image ? (
        <img src={news.image} alt={news.title} style={{ maxWidth: "820px", width: "100%", borderRadius: "8px" }} />
      ) : null}
      <p>{news.publishedAt}</p>
      <p>{news.category}</p>
      <p>{news.authorName}</p>
      <div>{news.content}</div>
    </article>
  );
}
