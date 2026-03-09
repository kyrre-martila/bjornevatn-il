import Link from "next/link";

import { getNewsListing } from "../../../lib/content";

export default async function NewsPage() {
  const newsItems = await getNewsListing();

  return (
    <section>
      <h1 className="public-page__title">News</h1>
      <ul className="public-list">
        {newsItems.map((item) => (
          <li key={item.slug} className="public-list__item">
            <p className="public-list__meta">{item.publishedAt}</p>
            <h2 className="public-list__title">{item.title}</h2>
            <p className="public-list__summary">{item.summary}</p>
            <Link href={`/page/${item.slug}`} className="public-list__link">
              Read page
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
