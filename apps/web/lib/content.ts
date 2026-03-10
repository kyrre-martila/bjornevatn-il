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
  canonicalUrl: string | null;
  noIndex: boolean;
};

export type NewsDetailItem = NewsItem & {
  body: string;
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
  | "youtube_url"
  | "site_url"
  | "robots_noindex"
  | "robots_disallow_all";

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
  id: string;
  slug: string;
  title: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
  data: Record<string, unknown> | null;
  updatedAt: string;
};

type ApiContentType = {
  slug: string;
};

type ApiSiteSetting = {
  key: string;
  value: string;
};

type ApiSlugRedirect = {
  redirectTo: string;
  permanent: boolean;
};

function isApiSlugRedirect(value: unknown): value is ApiSlugRedirect {
  const record = asRecord(value);
  return typeof record.redirectTo === "string";
}

const PUBLIC_SITE_SETTING_KEYS: SiteSettingKey[] = [
  "site_title",
  "site_tagline",
  "logo_url",
  "footer_text",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "site_url",
  "robots_noindex",
  "robots_disallow_all",
];

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
    canonicalUrl: item.canonicalUrl ?? null,
    noIndex: Boolean(item.noIndex),
  };
}

function mapApiContentItemDetail(item: ApiContentItem): NewsDetailItem {
  const mapped = mapApiContentItem(item);
  const data = asRecord(item.data);
  return {
    ...mapped,
    body: typeof data.body === "string" ? data.body : "",
  };
}

function boolSetting(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
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
    return [];
  }

  return items.map(mapApiContentItem);
}

export async function resolveNewsItemBySlug(
  slug: string,
): Promise<{ redirectTo: string | null; item: NewsDetailItem | null }> {
  const response = await fetchContent<ApiContentItem | ApiSlugRedirect>(
    `/content/items/type-slug/news/${encodeURIComponent(slug)}`,
  );

  if (isApiSlugRedirect(response)) {
    return { redirectTo: response.redirectTo, item: null };
  }

  const item = response;

  if (!item || !item.published) {
    return { redirectTo: null, item: null };
  }

  return { redirectTo: null, item: mapApiContentItemDetail(item) };
}

export async function getNewsItemBySlug(
  slug: string,
): Promise<NewsDetailItem | null> {
  const result = await resolveNewsItemBySlug(slug);
  return result.item;
}

export async function resolvePageContentBySlug(
  slug: string,
): Promise<{ redirectTo: string | null; page: ContentPage | null }> {
  const response = await fetchContent<ApiPage | ApiSlugRedirect>(
    `/content/pages/slug/${encodeURIComponent(slug)}`,
  );

  if (isApiSlugRedirect(response)) {
    return { redirectTo: response.redirectTo, page: null };
  }

  const page = response;

  if (!page || !page.published) {
    return { redirectTo: null, page: null };
  }

  return { redirectTo: null, page: mapApiPage(page) };
}

export async function getPageContentBySlug(
  slug: string,
): Promise<ContentPage | null> {
  const result = await resolvePageContentBySlug(slug);
  return result.page;
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

export async function getSiteUrl(): Promise<string> {
  const settings = await getPublicSiteSettings();
  const configured = settings.site_url?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return (envUrl ?? "http://localhost:3000").replace(/\/$/, "");
}

type SitemapPageEntry = {
  slug: string;
  canonicalUrl: string | null;
  updatedAt: string;
  noIndex: boolean;
};

type SitemapContentItemEntry = {
  contentTypeSlug: string;
  slug: string;
  canonicalUrl: string | null;
  updatedAt: string;
  noIndex: boolean;
};

export async function getSitemapPages(): Promise<SitemapPageEntry[]> {
  const pages = await fetchContent<
    Array<{
      slug: string;
      canonicalUrl: string | null;
      updatedAt: string;
      published: boolean;
      noIndex: boolean;
    }>
  >("/content/pages");

  if (!pages) {
    return [];
  }

  return pages
    .filter((page) => page.published)
    .map((page) => ({
      slug: page.slug,
      canonicalUrl: page.canonicalUrl ?? null,
      updatedAt: page.updatedAt,
      noIndex: Boolean(page.noIndex),
    }));
}

function contentItemPath(contentTypeSlug: string, slug: string): string | null {
  if (contentTypeSlug === "news") {
    return `/news/${slug}`;
  }

  return null;
}

export async function getSitemapContentItems(): Promise<SitemapContentItemEntry[]> {
  const types = await fetchContent<ApiContentType[]>("/content/types");
  if (!types) {
    return [];
  }

  const allItems = await Promise.all(
    types.map(async (type) => {
      const items = await fetchContent<ApiContentItem[]>(
        `/content/items/type-slug/${encodeURIComponent(type.slug)}`,
      );

      if (!items) {
        return [];
      }

      return items
        .filter((item) => item.published)
        .map((item) => ({
          contentTypeSlug: type.slug,
          slug: item.slug,
          canonicalUrl: item.canonicalUrl ?? null,
          updatedAt: item.updatedAt,
          noIndex: Boolean(item.noIndex),
        }));
    }),
  );

  return allItems
    .flat()
    .filter((item) => Boolean(item.canonicalUrl || contentItemPath(item.contentTypeSlug, item.slug)));
}

export async function getRobotsSettings(): Promise<{
  noIndex: boolean;
  disallowAll: boolean;
}> {
  const settings = await getPublicSiteSettings();

  return {
    noIndex: boolSetting(settings.robots_noindex),
    disallowAll: boolSetting(settings.robots_disallow_all),
  };
}

export function getContentItemPath(contentTypeSlug: string, slug: string): string | null {
  return contentItemPath(contentTypeSlug, slug);
}

export async function getPublicNavigationTree(): Promise<NavigationTreeItem[]> {
  const items = await fetchContent<unknown[]>("/content/navigation-items");
  if (!Array.isArray(items)) {
    return [];
  }

  const mappedItems = items
    .map(mapNavigationItem)
    .filter((item): item is NavigationItem => item !== null);

  if (mappedItems.length === 0) {
    return [];
  }

  return buildNavigationTree(mappedItems);
}
