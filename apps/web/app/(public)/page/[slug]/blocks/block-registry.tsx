import Link from "next/link";
import * as React from "react";

import type {
  ContentBlockType,
  GenericContentArchiveItem,
  HeroContent,
} from "../../../../../lib/content";
import {
  getContentItemPath,
  getContentTypeArchiveItems,
} from "../../../../../lib/content";

type RichTextData = { paragraphs: string[] };
type ImageData = {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};
type CtaData = {
  title?: string;
  description?: string;
  href: string;
  label: string;
};
type NewsListData = {
  title?: string;
  count?: number;
  contentTypeSlug?: string;
  linkLabel?: string;
};

export type BlockRenderResult = React.ReactNode | Promise<React.ReactNode>;

type BlockSchema<TData> = {
  validate: (data: unknown) => { valid: true; data: TData } | { valid: false };
};

type BlockDefinition<TData> = {
  type: ContentBlockType;
  schema: BlockSchema<TData>;
  renderer: (
    data: TData,
    context: { fallbackAltText: string },
  ) => BlockRenderResult;
};

type RegisteredBlock = {
  type: ContentBlockType;
  schema: BlockSchema<unknown>;
  renderer: (
    data: unknown,
    context: { fallbackAltText: string },
  ) => BlockRenderResult;
};

function HeroBlock({ data }: { data: HeroContent }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero hero--public section stack"
    >
      <div className="hero__inner stack">
        <p className="hero__eyebrow">{data.eyebrow}</p>
        <h1 id="hero-heading" className="hero__title">
          {data.title}
        </h1>
        <p className="hero__text">{data.subtitle}</p>
        <div className="hero__actions cluster">
          <Link href={data.primaryCta.href} className="button-primary">
            {data.primaryCta.label}
          </Link>
          <Link href={data.secondaryCta.href} className="button-secondary">
            {data.secondaryCta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

function RichTextBlock({ data }: { data: RichTextData }) {
  return (
    <section className="public-block public-block--rich-text section stack">
      <div className="public-block__content public-block__content--rich-text stack">
        {data.paragraphs.map((paragraph) => (
          <p key={paragraph} className="public-block__paragraph">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function ImageBlock({
  data,
  fallbackAltText,
}: {
  data: ImageData;
  fallbackAltText: string;
}) {
  return (
    <figure className="public-block public-block--image section stack">
      <img
        src={data.src}
        alt={(data.alt && data.alt.trim()) || fallbackAltText || "Image"}
        className="public-block__image"
        width={data.width ?? 1200}
        height={data.height ?? 675}
        loading="lazy"
        decoding="async"
      />
      {data.caption ? (
        <figcaption className="public-block__caption">
          {data.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function CtaBlock({ data }: { data: CtaData }) {
  return (
    <section className="public-block public-block--cta section stack">
      {data.title ? (
        <h2 className="public-block__title">{data.title}</h2>
      ) : null}
      <div className="public-block__content public-block__content--cta stack">
        {data.description ? <p>{data.description}</p> : null}
      </div>
      <Link href={data.href} className="button-primary public-block__button">
        {data.label}
      </Link>
    </section>
  );
}

function NewsListBlock({
  data,
  items,
  contentTypeSlug,
}: {
  data: NewsListData;
  items: GenericContentArchiveItem[];
  contentTypeSlug: string;
}) {
  const itemCount = typeof data.count === "number" ? data.count : items.length;
  const visibleItems = items.slice(0, itemCount);

  return (
    <section className="public-block public-block--news section stack">
      <h2 className="public-block__title">{data.title ?? "Latest content"}</h2>
      <ul className="news-list news-list--block stack">
        {visibleItems.map((item) => (
          <li key={item.slug} className="news-list__item stack">
            <p className="news-list__meta">{item.publishedAt}</p>
            <h3 className="news-list__title">{item.title}</h3>
            <p className="news-list__excerpt">{item.summary}</p>
            <Link
              href={
                getContentItemPath(contentTypeSlug, item.slug) ??
                `/${contentTypeSlug}/${item.slug}`
              }
              className="news-list__link"
            >
              {data.linkLabel ?? "Read more"}
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

    const paragraphs = record.paragraphs.filter(
      (value): value is string => typeof value === "string",
    );
    return { valid: true, data: { paragraphs } };
  },
};

const imageSchema: BlockSchema<ImageData> = {
  validate(data) {
    const record = asRecord(data);
    if (!isString(record.src)) {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        src: record.src,
        alt: isString(record.alt) ? record.alt : undefined,
        caption: isString(record.caption) ? record.caption : undefined,
        width: typeof record.width === "number" ? record.width : undefined,
        height: typeof record.height === "number" ? record.height : undefined,
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
        description: isString(record.description)
          ? record.description
          : undefined,
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
    if (
      record.contentTypeSlug !== undefined &&
      !isString(record.contentTypeSlug)
    ) {
      return { valid: false };
    }
    if (record.linkLabel !== undefined && !isString(record.linkLabel)) {
      return { valid: false };
    }

    return {
      valid: true,
      data: {
        title: isString(record.title) ? record.title : undefined,
        count: typeof record.count === "number" ? record.count : undefined,
        contentTypeSlug: isString(record.contentTypeSlug)
          ? record.contentTypeSlug
          : undefined,
        linkLabel: isString(record.linkLabel) ? record.linkLabel : undefined,
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
  renderer: (data, context) => (
    <ImageBlock data={data} fallbackAltText={context.fallbackAltText} />
  ),
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
    const configuredContentTypeSlug =
      data.contentTypeSlug?.trim() ||
      process.env.NEXT_PUBLIC_FEATURED_CONTENT_TYPE_SLUG?.trim() ||
      "";

    if (!configuredContentTypeSlug) {
      return null;
    }

    const items = await getContentTypeArchiveItems(configuredContentTypeSlug);
    return (
      <NewsListBlock
        data={data}
        items={items}
        contentTypeSlug={configuredContentTypeSlug}
      />
    );
  },
};

const blockRegistryInternal = {
  hero: heroBlock,
  rich_text: richTextBlock,
  image: imageBlock,
  cta: ctaBlock,
  news_list: newsListBlock,
};

function registerBlock<TData>(
  definition: BlockDefinition<TData>,
): RegisteredBlock {
  return {
    type: definition.type,
    schema: {
      validate: (data) =>
        definition.schema.validate(data) as
          | { valid: true; data: unknown }
          | { valid: false },
    },
    renderer: (data, context) => definition.renderer(data as TData, context),
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
