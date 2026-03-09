import { resolveApiUrl } from "./api";

export type HeroContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
};

export type NewsItem = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
};

export type ContentBlockType = "hero" | "rich_text" | "cta" | "image" | "news_list";

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  order: number;
  data: Record<string, unknown>;
};

export type ContentPage = {
  slug: string;
  title: string;
  blocks: ContentBlock[];
};

type ApiPageBlock = {
  id: string;
  type: ContentBlockType;
  order: number;
  data: unknown;
};

type ApiPage = {
  slug: string;
  title: string;
  published: boolean;
  blocks?: ApiPageBlock[];
};

type ApiPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function fetchContent<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(resolveApiUrl(path), {
      method: "GET",
      next: { revalidate: 60 },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Content request failed (${response.status}) for ${path}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Content request failed for ${path}`, error);
    return null;
  }
}

function mapApiPageBlock(block: ApiPageBlock): ContentBlock {
  return {
    id: block.id,
    type: block.type,
    order: block.order,
    data: asRecord(block.data),
  };
}

function mapApiPage(page: ApiPage): ContentPage {
  const blocks = Array.isArray(page.blocks) ? page.blocks.map(mapApiPageBlock) : [];

  return {
    slug: page.slug,
    title: page.title,
    blocks: blocks.sort((a, b) => a.order - b.order),
  };
}

function mapApiPost(post: ApiPost): NewsItem {
  return {
    slug: post.slug,
    title: post.title,
    summary: post.excerpt,
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : "",
  };
}

function mapHeroFromPage(page: ContentPage): HeroContent | null {
  const heroBlock = page.blocks.find((block) => block.type === "hero");
  if (!heroBlock) {
    return null;
  }

  const data = heroBlock.data;
  const primaryCta = asRecord(data.primaryCta);
  const secondaryCta = asRecord(data.secondaryCta);

  return {
    eyebrow: typeof data.eyebrow === "string" ? data.eyebrow : "",
    title: typeof data.title === "string" ? data.title : page.title,
    subtitle: typeof data.subtitle === "string" ? data.subtitle : "",
    primaryCta: {
      href: typeof primaryCta.href === "string" ? primaryCta.href : "/news",
      label: typeof primaryCta.label === "string" ? primaryCta.label : "Read latest news",
    },
    secondaryCta: {
      href: typeof secondaryCta.href === "string" ? secondaryCta.href : "/news",
      label: typeof secondaryCta.label === "string" ? secondaryCta.label : "Browse news",
    },
  };
}

export async function getHomepageContent(): Promise<HeroContent> {
  const apiPage = await fetchContent<ApiPage>("/content/pages/slug/home");
  if (!apiPage || !apiPage.published) {
    return {
      eyebrow: "",
      title: "",
      subtitle: "",
      primaryCta: { href: "/news", label: "News" },
      secondaryCta: { href: "/", label: "Home" },
    };
  }

  const hero = mapHeroFromPage(mapApiPage(apiPage));
  return hero ?? {
    eyebrow: "",
    title: apiPage.title,
    subtitle: "",
    primaryCta: { href: "/news", label: "News" },
    secondaryCta: { href: "/", label: "Home" },
  };
}

export async function getNewsListing(): Promise<NewsItem[]> {
  const posts = await fetchContent<ApiPost[]>("/content/posts/published/listing");
  if (!posts) {
    return [];
  }

  return posts.map(mapApiPost);
}

export async function getPageContentBySlug(slug: string): Promise<ContentPage | null> {
  const page = await fetchContent<ApiPage>(`/content/pages/slug/${encodeURIComponent(slug)}`);
  if (!page || !page.published) {
    return null;
  }

  return mapApiPage(page);
}
