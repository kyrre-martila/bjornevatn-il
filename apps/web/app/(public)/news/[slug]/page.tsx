import { notFound } from "next/navigation";

import { getClubNewsBySlug } from "../../../../lib/content";

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

  return (
    <article className="stack">
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
