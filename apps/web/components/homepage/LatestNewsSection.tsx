import { ImageAsset } from "../media/ImageAsset";
import Link from "next/link";

import type { ClubNewsItem } from "../../lib/content";

type LatestNewsSectionProps = {
  title: string;
  items: ClubNewsItem[];
};

export default function LatestNewsSection({ title, items }: LatestNewsSectionProps) {
  return (
    <section className="homepage-news stack stack--sm" aria-labelledby="homepage-news-title">
      <h2 id="homepage-news-title">{title}</h2>
      <div className="homepage-news__grid">
        {items.map((item) => (
          <article key={item.id} className="homepage-news__card stack stack--sm">
            {item.image ? (
              <ImageAsset className="homepage-news__image" imageClassName="homepage-news__image" src={item.image} alt={item.title} />
            ) : null}
            <p className="homepage-news__category">{item.category}</p>
            <h3>{item.title}</h3>
            <p>{item.excerpt}</p>
            <p className="homepage-news__date">{item.publishedAt}</p>
            <Link href={`/news/${item.slug}`}>Les mer</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
