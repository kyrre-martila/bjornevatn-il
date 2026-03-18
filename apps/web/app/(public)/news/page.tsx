import type { Metadata } from "next";
import Link from "next/link";

import { getClubNews } from "../../../lib/content";
import { buildMetadata } from "../../../lib/seo";
import { measureServerTiming } from "../../../lib/observability";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    pageTitle: "News | Bjørnevatn IL",
    pageDescription: "Latest news from Bjørnevatn IL",
    path: "/news",
  });
}

export default async function NewsPage() {
  const news = (
    await measureServerTiming(
      { flow: "public_news_listing_load", route: "/news", module: "news" },
      () => getClubNews(),
    )
  ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="stack">
      <h1>Nyheter</h1>
      <div className="grid grid--2">
        {news.map((item) => (
          <article
            key={item.id}
            className="public-block stack"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                style={{ width: "100%", borderRadius: "6px" }}
              />
            ) : null}
            <h2>{item.title}</h2>
            <p>{item.excerpt}</p>
            <p>{item.category}</p>
            <p>{item.publishedAt}</p>
            <Link href={`/news/${item.slug}`}>Les mer</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
