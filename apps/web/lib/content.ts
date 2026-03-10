import { resolveApiUrl } from "./api";
import {
  DEMO_NAVIGATION_ITEMS,
  DEMO_NEWS_ITEMS,
  DEMO_PAGE_BY_SLUG,
} from "./demo-content";

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

export type ContentBlockType =
  | "hero"
  | "rich_text"
  | "cta"
  | "image"
  | "news_list";

const CONTENT_BLOCK_TYPES: ContentBlockType[] = [
  "hero",
  "rich_text",
  "cta",
  "image",
  "news_list",
];

function isContentBlockType(value: unknown): value is ContentBlockType {
  return (
    typeof value === "string" &&
    CONTENT_BLOCK_TYPES.includes(value as ContentBlockType)
  );
}

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  order: number;
  data: Record<string, unknown>;
};

export type ContentPage = {
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  blocks: ContentBlock[];
};

export type SiteSettingKey =
  | "site_title"
  | "site_tagline"
  | "logo_url"
  | "footer_text"
  | "facebook_url"
  | "instagram_url"
  | "youtube_url";

export type PublicSiteSettings = Partial<Record<SiteSettingKey, string>>;

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  parentId: string | null;
};

export type NavigationTreeItem = NavigationItem & {
  children: NavigationTreeItem[];
};

type ApiPageBlock = {
  id: string;
  type: string;
  order: number;
  data: unknown;
};

type ApiPage = {
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
  blocks?: ApiPageBlock[];
};

type ApiContentItem = {
  slug: string;
  title: string;
  data: Record<string, unknown> | null;
  updatedAt: string;
};

type ApiSiteSetting = {
  key: string;
  value: string;
};

const PUBLIC_SITE_SETTING_KEYS: SiteSettingKey[] = [
  "site_title",
  "site_tagline",
  "logo_url",
  "footer_text",
  "facebook_url",
  "instagram_url",
  "youtube_url",
];

function shouldUseDemoContentFallback(): boolean {
  const configuredMode = process.env.CONTENT_DEMO_MODE?.trim().toLowerCase();

  if (configuredMode === "true" || configuredMode === "1") {
    return true;
  }

  if (configuredMode === "false" || configuredMode === "0") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

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
      throw new Error(
        `Content request failed (${response.status}) for ${path}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Content request failed for ${path}`, error);
    return null;
  }
}

function mapApiPageBlock(block: ApiPageBlock): ContentBlock | null {
  if (!isContentBlockType(block.type)) {
    console.warn(
      `Unknown block type \"${block.type}\" received from content API; skipping block.`,
    );
    return null;
  }

  return {
    id: block.id,
    type: block.type,
    order: block.order,
    data: asRecord(block.data),
  };
}

function mapApiPage(page: ApiPage): ContentPage {
  const blocks = Array.isArray(page.blocks)
    ? page.blocks
        .map(mapApiPageBlock)
        .filter((block): block is ContentBlock => block !== null)
    : [];

  return {
    slug: page.slug,
    title: page.title,
    seoTitle: page.seoTitle ?? null,
    seoDescription: page.seoDescription ?? null,
    seoImage: page.seoImage ?? null,
    canonicalUrl: page.canonicalUrl ?? null,
    noIndex: Boolean(page.noIndex),
    blocks: blocks.sort((a, b) => a.order - b.order),
  };
}

function mapApiContentItem(item: ApiContentItem): NewsItem {
  const data = asRecord(item.data);
  const publishedAt =
    typeof data.publishedAt === "string" ? data.publishedAt : item.updatedAt;

  return {
    slug: item.slug,
    title: item.title,
    summary: typeof data.excerpt === "string" ? data.excerpt : "",
    publishedAt: new Date(publishedAt).toISOString().slice(0, 10),
  };
}

function sortNavigationItems(items: NavigationItem[]): NavigationItem[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });
}

function mapNavigationItem(item: unknown): NavigationItem | null {
  const record = asRecord(item);
  if (
    typeof record.id !== "string" ||
    typeof record.label !== "string" ||
    typeof record.url !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    label: record.label,
    url: record.url,
    order: typeof record.order === "number" ? record.order : 0,
    parentId: typeof record.parentId === "string" ? record.parentId : null,
  };
}

function buildNavigationTree(items: NavigationItem[]): NavigationTreeItem[] {
  const sorted = sortNavigationItems(items);
  const byId = new Map<string, NavigationTreeItem>();

  sorted.forEach((item) => {
    byId.set(item.id, { ...item, children: [] });
  });

  const rootItems: NavigationTreeItem[] = [];

  sorted.forEach((item) => {
    const entry = byId.get(item.id);
    if (!entry) {
      return;
    }

    if (item.parentId) {
      const parent = byId.get(item.parentId);
      if (parent) {
        parent.children.push(entry);
        parent.children.sort((a, b) => {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          return a.label.localeCompare(b.label);
        });
        return;
      }
    }

    rootItems.push(entry);
  });

  return rootItems;
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
      label:
        typeof primaryCta.label === "string"
          ? primaryCta.label
          : "Read latest news",
    },
    secondaryCta: {
      href: typeof secondaryCta.href === "string" ? secondaryCta.href : "/news",
      label:
        typeof secondaryCta.label === "string"
          ? secondaryCta.label
          : "Browse news",
    },
  };
}

export async function getHomepageContent(): Promise<HeroContent> {
  const apiPage = await fetchContent<ApiPage>("/content/pages/slug/home");
  if (!apiPage || !apiPage.published) {
    const fallbackPage = shouldUseDemoContentFallback()
      ? DEMO_PAGE_BY_SLUG.get("home")
      : null;
    const fallbackHero = fallbackPage ? mapHeroFromPage(fallbackPage) : null;
    if (fallbackHero) {
      return fallbackHero;
    }

    return {
      eyebrow: "",
      title: "",
      subtitle: "",
      primaryCta: { href: "/news", label: "News" },
      secondaryCta: { href: "/", label: "Home" },
    };
  }

  const hero = mapHeroFromPage(mapApiPage(apiPage));
  return (
    hero ?? {
      eyebrow: "",
      title: apiPage.title,
      subtitle: "",
      primaryCta: { href: "/news", label: "News" },
      secondaryCta: { href: "/", label: "Home" },
    }
  );
}

export async function getNewsListing(): Promise<NewsItem[]> {
  const items = await fetchContent<ApiContentItem[]>(
    "/content/items/type-slug/news",
  );
  if (!items) {
    return shouldUseDemoContentFallback() ? DEMO_NEWS_ITEMS : [];
  }

  return items.map(mapApiContentItem);
}

export async function getPageContentBySlug(
  slug: string,
): Promise<ContentPage | null> {
  const page = await fetchContent<ApiPage>(
    `/content/pages/slug/${encodeURIComponent(slug)}`,
  );
  if (!page || !page.published) {
    if (shouldUseDemoContentFallback()) {
      const demo = DEMO_PAGE_BY_SLUG.get(slug);
      return demo
        ? {
            ...demo,
            seoTitle: null,
            seoDescription: null,
            seoImage: null,
            canonicalUrl: null,
            noIndex: false,
          }
        : null;
    }

    return null;
  }

  return mapApiPage(page);
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const settings = await fetchContent<ApiSiteSetting[]>("/content/settings");
  if (!settings) {
    return {};
  }

  const keySet = new Set(PUBLIC_SITE_SETTING_KEYS);

  return settings.reduce<PublicSiteSettings>((acc, setting) => {
    if (
      keySet.has(setting.key as SiteSettingKey) &&
      typeof setting.value === "string" &&
      setting.value.trim()
    ) {
      acc[setting.key as SiteSettingKey] = setting.value.trim();
    }
    return acc;
  }, {});
}

export async function getPublicNavigationTree(): Promise<NavigationTreeItem[]> {
  const items = await fetchContent<unknown[]>("/content/navigation-items");
  if (!Array.isArray(items)) {
    return shouldUseDemoContentFallback()
      ? buildNavigationTree(DEMO_NAVIGATION_ITEMS)
      : [];
  }

  const mappedItems = items
    .map(mapNavigationItem)
    .filter((item): item is NavigationItem => item !== null);

  if (mappedItems.length === 0) {
    return shouldUseDemoContentFallback()
      ? buildNavigationTree(DEMO_NAVIGATION_ITEMS)
      : [];
  }

  return buildNavigationTree(mappedItems);
}
