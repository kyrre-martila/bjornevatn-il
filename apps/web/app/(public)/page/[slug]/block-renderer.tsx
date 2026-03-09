import Link from "next/link";

import type { ContentBlock, HeroContent, NewsItem } from "../../../../lib/content";
import { getNewsListing } from "../../../../lib/content";

type RichTextData = { paragraphs?: string[] };
type ImageData = { src?: string; alt?: string; caption?: string };
type CtaData = { title?: string; description?: string; href?: string; label?: string };
type NewsListData = { title?: string; count?: number };

function HeroBlock({ data }: { data: HeroContent }) {
  return (
    <section aria-labelledby="hero-heading" className="hero">
      <p className="hero__eyebrow">{data.eyebrow}</p>
      <h1 id="hero-heading" className="hero__title">
        {data.title}
      </h1>
      <p className="hero__subtitle">{data.subtitle}</p>
      <div className="hero__cta-row">
        <Link href={data.primaryCta.href} className="button-primary">
          {data.primaryCta.label}
        </Link>
        <Link href={data.secondaryCta.href} className="button-secondary">
          {data.secondaryCta.label}
        </Link>
      </div>
    </section>
  );
}

function RichTextBlock({ data }: { data: RichTextData }) {
  const paragraphs = Array.isArray(data.paragraphs)
    ? data.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === "string")
    : [];

  return (
    <section className="public-page__body">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function ImageBlock({ data }: { data: ImageData }) {
  if (!data.src || !data.alt) {
    return null;
  }

  return (
    <figure className="public-block__image">
      <img src={data.src} alt={data.alt} />
      {data.caption ? <figcaption>{data.caption}</figcaption> : null}
    </figure>
  );
}

function CtaBlock({ data }: { data: CtaData }) {
  if (!data.href || !data.label) {
    return null;
  }

  return (
    <section className="public-block__cta">
      {data.title ? <h2>{data.title}</h2> : null}
      {data.description ? <p>{data.description}</p> : null}
      <Link href={data.href} className="button-primary">
        {data.label}
      </Link>
    </section>
  );
}

function NewsListBlock({ data, items }: { data: NewsListData; items: NewsItem[] }) {
  const itemCount = typeof data.count === "number" ? data.count : items.length;
  const visibleItems = items.slice(0, itemCount);

  return (
    <section>
      <h2 className="public-page__title">{data.title ?? "News"}</h2>
      <ul className="public-list">
        {visibleItems.map((item) => (
          <li key={item.slug} className="public-list__item">
            <p className="public-list__meta">{item.publishedAt}</p>
            <h3 className="public-list__title">{item.title}</h3>
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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export async function renderBlock(block: ContentBlock) {
  const blockData = asRecord(block.data);

  switch (block.type) {
    case "hero":
      return <HeroBlock data={blockData as HeroContent} />;
    case "rich_text":
      return <RichTextBlock data={blockData as RichTextData} />;
    case "image":
      return <ImageBlock data={blockData as ImageData} />;
    case "cta":
      return <CtaBlock data={blockData as CtaData} />;
    case "news_list": {
      const newsItems = await getNewsListing();
      return <NewsListBlock data={blockData as NewsListData} items={newsItems} />;
    }
    default:
      return null;
  }
}
