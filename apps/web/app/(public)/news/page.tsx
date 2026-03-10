import Link from "next/link";

import { getNewsListing } from "../../../lib/content";

export default async function NewsPage() {
  const newsItems = await getNewsListing();

  return (
    <section className="public-block public-block--news-page section stack">
      <h1 className="public-block__title">News</h1>
      <ul className="news-list news-list--page stack">
        {newsItems.map((item) => (
          <li key={item.slug} className="news-list__item stack">
            <p className="news-list__meta">{item.publishedAt}</p>
            <h2 className="news-list__title">{item.title}</h2>
            <p className="news-list__excerpt">{item.summary}</p>
            <Link href={`/news/${item.slug}`} className="news-list__link">
              Read story
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
