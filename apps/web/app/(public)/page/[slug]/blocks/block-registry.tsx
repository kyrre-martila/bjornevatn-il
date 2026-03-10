import Link from "next/link";
import * as React from "react";

import type { ContentBlockType, HeroContent, NewsItem } from "../../../../../lib/content";
import { getNewsListing } from "../../../../../lib/content";

type RichTextData = { paragraphs: string[] };
type ImageData = { src: string; alt: string; caption?: string };
type CtaData = { title?: string; description?: string; href: string; label: string };
type NewsListData = { title?: string; count?: number };

export type BlockRenderResult = React.ReactNode | Promise<React.ReactNode>;

type BlockSchema<TData> = {
  validate: (data: unknown) => { valid: true; data: TData } | { valid: false };
};

type BlockDefinition<TData> = {
  type: ContentBlockType;
  schema: BlockSchema<TData>;
  renderer: (data: TData) => BlockRenderResult;
};

type RegisteredBlock = {
  type: ContentBlockType;
  schema: BlockSchema<unknown>;
  renderer: (data: unknown) => BlockRenderResult;
};


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
  return (
    <section className="public-page__body">
      {data.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function ImageBlock({ data }: { data: ImageData }) {
  return (
    <figure className="public-block__image">
      <img src={data.src} alt={data.alt} />
      {data.caption ? <figcaption>{data.caption}</figcaption> : null}
    </figure>
  );
}

function CtaBlock({ data }: { data: CtaData }) {
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
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

const heroSchema: BlockSchema<HeroContent> = {
  validate(data) {
    const record = asRecord(data);
    const primaryCta = asRecord(record.primaryCta);
    const secondaryCta = asRecord(record.secondaryCta);

    if (
      !isString(record.eyebrow) ||
      !isString(record.title) ||
      !isString(record.subtitle) ||
      !isString(primaryCta.href) ||
      !isString(primaryCta.label) ||
      !isString(secondaryCta.href) ||
      !isString(secondaryCta.label)
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        eyebrow: record.eyebrow,
        title: record.title,
        subtitle: record.subtitle,
        primaryCta: {
          href: primaryCta.href,
          label: primaryCta.label,
        },
        secondaryCta: {
          href: secondaryCta.href,
          label: secondaryCta.label,
        },
      },
    };
  },
};

const richTextSchema: BlockSchema<RichTextData> = {
  validate(data) {
    const record = asRecord(data);
    if (!Array.isArray(record.paragraphs)) {
      return { valid: false };
    }

    const paragraphs = record.paragraphs.filter((value): value is string => typeof value === "string");
    return { valid: true, data: { paragraphs } };
  },
};

const imageSchema: BlockSchema<ImageData> = {
  validate(data) {
    const record = asRecord(data);
    if (!isString(record.src) || !isString(record.alt)) {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        src: record.src,
        alt: record.alt,
        caption: isString(record.caption) ? record.caption : undefined,
      },
    };
  },
};

const ctaSchema: BlockSchema<CtaData> = {
  validate(data) {
    const record = asRecord(data);
    if (!isString(record.href) || !isString(record.label)) {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        href: record.href,
        label: record.label,
        title: isString(record.title) ? record.title : undefined,
        description: isString(record.description) ? record.description : undefined,
      },
    };
  },
};

const newsListSchema: BlockSchema<NewsListData> = {
  validate(data) {
    const record = asRecord(data);
    if (record.title !== undefined && !isString(record.title)) {
      return { valid: false };
    }
    if (record.count !== undefined && typeof record.count !== "number") {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        title: isString(record.title) ? record.title : undefined,
        count: typeof record.count === "number" ? record.count : undefined,
      },
    };
  },
};

const heroBlock: BlockDefinition<HeroContent> = {
  type: "hero",
  schema: heroSchema,
  renderer: (data) => <HeroBlock data={data} />,
};

const richTextBlock: BlockDefinition<RichTextData> = {
  type: "rich_text",
  schema: richTextSchema,
  renderer: (data) => <RichTextBlock data={data} />,
};

const imageBlock: BlockDefinition<ImageData> = {
  type: "image",
  schema: imageSchema,
  renderer: (data) => <ImageBlock data={data} />,
};

const ctaBlock: BlockDefinition<CtaData> = {
  type: "cta",
  schema: ctaSchema,
  renderer: (data) => <CtaBlock data={data} />,
};

const newsListBlock: BlockDefinition<NewsListData> = {
  type: "news_list",
  schema: newsListSchema,
  renderer: async (data) => {
    const items = await getNewsListing();
    return <NewsListBlock data={data} items={items} />;
  },
};

const blockRegistryInternal = {
  hero: heroBlock,
  rich_text: richTextBlock,
  image: imageBlock,
  cta: ctaBlock,
  news_list: newsListBlock,
};

function registerBlock<TData>(definition: BlockDefinition<TData>): RegisteredBlock {
  return {
    type: definition.type,
    schema: {
      validate: (data) => definition.schema.validate(data) as { valid: true; data: unknown } | { valid: false },
    },
    renderer: (data) => definition.renderer(data as TData),
  };
}

export const blockRegistry: Record<ContentBlockType, RegisteredBlock> = {
  hero: registerBlock(blockRegistryInternal.hero),
  rich_text: registerBlock(blockRegistryInternal.rich_text),
  image: registerBlock(blockRegistryInternal.image),
  cta: registerBlock(blockRegistryInternal.cta),
  news_list: registerBlock(blockRegistryInternal.news_list),
};

export function getBlockDefinition(type: string): RegisteredBlock | null {
  return type in blockRegistry
    ? blockRegistry[type as keyof typeof blockRegistry]
    : null;
}
