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
  templateKey: string;
  canonicalUrl: string | null;
  noIndex: boolean;
};

export type NewsDetailItem = NewsItem & {
  body: string;
};

export type ServiceListItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  childCount: number;
};

export type ServiceDetailItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  featuredImage: string | null;
  callToActionLabel: string;
  callToActionUrl: string;
  relatedServices: Array<{ slug: string; title: string }>;
  childServices: Array<{ slug: string; title: string }>;
  taxonomyTerms: string[];
  templateKey: string;
  canonicalUrl: string | null;
  noIndex: boolean;
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
  templateKey: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  blocks: ContentBlock[];
};

export type SiteSettingKey =
  | "siteName"
  | "siteUrl"
  | "defaultSeoImage"
  | "defaultTitleSuffix"
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
  templateKey: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  blocks?: ApiPageBlock[];
};

type ApiContentItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  shortDescription: string;
  featuredImage: string | null;
  callToActionLabel: string;
  callToActionUrl: string;
  relatedItemIds: string[];
  publishedAt: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: string;
  parentId?: string | null;
};

type ApiContentItemTree = ApiContentItem & {
  parentId?: string | null;
  children?: ApiContentItemTree[];
};

type ApiContentType = {
  id?: string;
  name?: string;
  slug: string;
  description?: string;
  fields?: unknown;
  templateKey?: string | null;
  public?: boolean;
  isPublic?: boolean;
  visibility?: string;
};

export type PublicContentType = {
  slug: string;
  name: string;
  templateKey: string;
  isPublic: boolean;
};

export type GenericContentArchiveItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
};

export type GenericContentDetailItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  templateKey: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  publishedAt: string;
};

type ApiSiteSetting = {
  key: string;
  value: string;
};

type ApiSlugRedirect = {
  redirectTo: string;
  permanent?: boolean;
};

export type ResolvedRedirect = {
  target: string;
  permanent: boolean;
};

function isApiSlugRedirect(value: unknown): value is ApiSlugRedirect {
  const record = asRecord(value);
  return typeof record.redirectTo === "string";
}

function isApiContentItem(value: unknown): value is ApiContentItem {
  const record = asRecord(value);
  return (
    typeof record.id === "string" &&
    typeof record.slug === "string" &&
    typeof record.title === "string"
  );
}

function isApiPage(value: unknown): value is ApiPage {
  const record = asRecord(value);
  return typeof record.slug === "string" && typeof record.title === "string";
}

function toResolvedRedirect(value: unknown): ResolvedRedirect | null {
  if (!isApiSlugRedirect(value)) {
    return null;
  }

  const target = sanitizeInternalRedirectTarget(value.redirectTo);
  if (!target) {
    return null;
  }

  return {
    target,
    // Redirects are permanent by default when the API does not specify otherwise.
    permanent: value.permanent !== false,
  };
}

const PUBLIC_SITE_SETTING_KEYS: SiteSettingKey[] = [
  "siteName",
  "siteUrl",
  "defaultSeoImage",
  "defaultTitleSuffix",
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

export type SiteConfiguration = {
  siteName: string;
  siteUrl: string;
  defaultSeoImage: string | null;
  defaultTitleSuffix: string | null;
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
    templateKey:
      typeof page.templateKey === "string" && page.templateKey.trim()
        ? page.templateKey
        : "index",
    seoTitle: page.seoTitle ?? null,
    seoDescription: page.seoDescription ?? null,
    seoImage: page.seoImage ?? null,
    canonicalUrl: page.canonicalUrl ?? null,
    noIndex: Boolean(page.noIndex),
    blocks: blocks.sort((a, b) => a.order - b.order),
  };
}

function mapApiContentItem(item: ApiContentItem): NewsItem {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    publishedAt: new Date(item.publishedAt).toISOString().slice(0, 10),
    templateKey: "index",
    canonicalUrl: item.canonicalUrl ?? null,
    noIndex: Boolean(item.noIndex),
  };
}

function mapApiContentItemDetail(item: ApiContentItem): NewsDetailItem {
  const mapped = mapApiContentItem(item);
  return {
    ...mapped,
    body: item.body,
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
  const apiPage = await fetchContent<ApiPage>("/public/content/pages/slug/home");
  if (!apiPage) {
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
    "/public/content/items/type-slug/news",
  );
  if (!items) {
    return [];
  }

  return items.map(mapApiContentItem);
}

function mapServiceListItem(
  item: ApiContentItem,
  childCount: number,
): ServiceListItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    shortDescription: item.shortDescription,
    childCount,
  };
}

function flattenContentItemTree(
  items: ApiContentItemTree[],
): ApiContentItemTree[] {
  return items.flatMap((item) => [
    item,
    ...flattenContentItemTree(item.children ?? []),
  ]);
}

function flattenServiceTree(items: ApiContentItemTree[]): ApiContentItemTree[] {
  return flattenContentItemTree(items);
}

export async function getServicesListing(): Promise<ServiceListItem[]> {
  const tree = await fetchContent<ApiContentItemTree[]>(
    "/public/content/items/type-slug/services?mode=tree",
  );

  if (!tree) {
    return [];
  }

  return flattenServiceTree(tree).map((item) =>
    mapServiceListItem(item, item.children?.length ?? 0),
  );
}

async function getContentTypeTemplateKey(slug: string): Promise<string> {
  const type = await getPublicContentTypeBySlug(slug);
  return type?.templateKey ?? "index";
}

function mapPublicContentType(type: ApiContentType): PublicContentType | null {
  const isPublic =
    typeof type.isPublic === "boolean"
      ? type.isPublic
      : type.public !== false &&
        (typeof type.visibility !== "string" ||
          type.visibility.trim().toLowerCase() === "public");

  if (!isPublic) {
    return null;
  }

  if (typeof type.slug !== "string" || !type.slug.trim()) {
    return null;
  }

  return {
    slug: type.slug,
    name:
      typeof type.name === "string" && type.name.trim() ? type.name : type.slug,
    templateKey:
      typeof type.templateKey === "string" && type.templateKey.trim()
        ? type.templateKey
        : "index",
    isPublic,
  };
}

export async function getPublicContentTypes(): Promise<PublicContentType[]> {
  const types = await fetchContent<ApiContentType[]>("/public/content/types");
  if (!types) {
    return [];
  }

  return types
    .map(mapPublicContentType)
    .filter(
      (type): type is PublicContentType => type !== null && type.isPublic,
    );
}

export async function getPublicContentTypeBySlug(
  slug: string,
): Promise<PublicContentType | null> {
  const types = await getPublicContentTypes();
  return types.find((type) => type.slug === slug) ?? null;
}

function mapGenericArchiveItem(
  item: ApiContentItem,
): GenericContentArchiveItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    publishedAt: new Date(item.publishedAt).toISOString().slice(0, 10),
  };
}

export async function getContentTypeArchiveItems(
  contentTypeSlug: string,
): Promise<GenericContentArchiveItem[]> {
  const contentType = await getPublicContentTypeBySlug(contentTypeSlug);
  if (!contentType) {
    return [];
  }

  const items = await fetchContent<ApiContentItem[]>(
    `/public/content/items/type-slug/${encodeURIComponent(contentTypeSlug)}`,
  );

  if (!items) {
    return [];
  }

  return items.map(mapGenericArchiveItem);
}

function mapGenericDetailItem(
  item: ApiContentItem,
  fallbackTemplateKey: string,
): GenericContentDetailItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    body: item.body,
    templateKey: fallbackTemplateKey,
    canonicalUrl: item.canonicalUrl ?? null,
    noIndex: Boolean(item.noIndex),
    publishedAt: new Date(item.publishedAt).toISOString().slice(0, 10),
  };
}

export async function resolveContentItemBySlug(
  contentTypeSlug: string,
  slug: string,
): Promise<{
  redirect: ResolvedRedirect | null;
  item: GenericContentDetailItem | null;
}> {
  const contentType = await getPublicContentTypeBySlug(contentTypeSlug);
  if (!contentType) {
    return { redirect: null, item: null };
  }

  const response = await fetchContent<ApiContentItem | ApiSlugRedirect>(
    `/public/content/items/type-slug/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(slug)}`,
  );

  const redirect = toResolvedRedirect(response);
  if (redirect) {
    return { redirect, item: null };
  }

  if (!isApiContentItem(response)) {
    return { redirect: null, item: null };
  }

  return {
    redirect: null,
    item: mapGenericDetailItem(response, contentType.templateKey),
  };
}

async function getServiceTaxonomyTermNames(
  contentItemId: string,
): Promise<string[]> {
  const terms = await fetchContent<string[]>(
    `/public/content/items/${encodeURIComponent(contentItemId)}/service-categories`,
  );

  return Array.isArray(terms)
    ? terms.filter((term): term is string => typeof term === "string")
    : [];
}

export async function resolveServiceBySlug(
  slug: string,
): Promise<{ redirect: ResolvedRedirect | null; item: ServiceDetailItem | null }> {
  const [response, services, templateKey] = await Promise.all([
    fetchContent<ApiContentItem | ApiSlugRedirect>(
      `/public/content/items/type-slug/services/${encodeURIComponent(slug)}`,
    ),
    fetchContent<ApiContentItemTree[]>(
      "/public/content/items/type-slug/services?mode=tree",
    ),
    getContentTypeTemplateKey("services"),
  ]);

  const redirect = toResolvedRedirect(response);
  if (redirect) {
    return { redirect, item: null };
  }

  if (!isApiContentItem(response)) {
    return { redirect: null, item: null };
  }

  const item = response;
  const tree = services ?? [];
  const allServices = flattenServiceTree(tree);
  const relatedIds = item.relatedItemIds;

  const relatedServices = relatedIds
    .map((id) => allServices.find((entry) => entry.id === id))
    .filter((entry): entry is ApiContentItemTree => Boolean(entry))
    .map((entry) => ({ slug: entry.slug, title: entry.title }));

  const childServices = allServices
    .filter((entry) => entry.parentId === item.id)
    .map((entry) => ({ slug: entry.slug, title: entry.title }));

  const taxonomyTerms = await getServiceTaxonomyTermNames(item.id);

  return {
    redirect: null,
    item: {
      id: item.id,
      slug: item.slug,
      title: item.title,
      shortDescription: item.shortDescription,
      body: item.body,
      featuredImage: item.featuredImage,
      callToActionLabel: item.callToActionLabel,
      callToActionUrl: item.callToActionUrl,
      relatedServices,
      childServices,
      taxonomyTerms,
      templateKey,
      canonicalUrl: item.canonicalUrl ?? null,
      noIndex: Boolean(item.noIndex),
    },
  };
}

export async function resolveNewsItemBySlug(
  slug: string,
): Promise<{ redirect: ResolvedRedirect | null; item: NewsDetailItem | null }> {
  const [response, templateKey] = await Promise.all([
    fetchContent<ApiContentItem | ApiSlugRedirect>(
      `/public/content/items/type-slug/news/${encodeURIComponent(slug)}`,
    ),
    getContentTypeTemplateKey("news"),
  ]);

  const redirect = toResolvedRedirect(response);
  if (redirect) {
    return { redirect, item: null };
  }

  if (!isApiContentItem(response)) {
    return { redirect: null, item: null };
  }

  return {
    redirect: null,
    item: {
      ...mapApiContentItemDetail(response),
      templateKey,
    },
  };
}

export async function getNewsItemBySlug(
  slug: string,
): Promise<NewsDetailItem | null> {
  const result = await resolveNewsItemBySlug(slug);
  return result.item;
}

export async function resolvePageContentBySlug(
  slug: string,
): Promise<{ redirect: ResolvedRedirect | null; page: ContentPage | null }> {
  const response = await fetchContent<ApiPage | ApiSlugRedirect>(
    `/public/content/pages/slug/${encodeURIComponent(slug)}`,
  );

  const redirect = toResolvedRedirect(response);
  if (redirect) {
    return { redirect, page: null };
  }

  if (!isApiPage(response)) {
    return { redirect: null, page: null };
  }

  return { redirect: null, page: mapApiPage(response) };
}

export async function getPageContentBySlug(
  slug: string,
): Promise<ContentPage | null> {
  const result = await resolvePageContentBySlug(slug);
  return result.page;
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const settings = await fetchContent<ApiSiteSetting[]>("/public/content/settings");
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
  const config = await getSiteConfiguration();

  return config.siteUrl;
}

function envSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  return (envUrl ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function getSiteConfiguration(): Promise<SiteConfiguration> {
  const settings = await getPublicSiteSettings();
  const siteUrl = (settings.siteUrl ?? settings.site_url)?.trim();
  const siteName = (settings.siteName ?? settings.site_title)?.trim();
  const defaultSeoImage = settings.defaultSeoImage?.trim();
  const defaultTitleSuffix = settings.defaultTitleSuffix?.trim();

  return {
    siteName: siteName || "Blueprint Website",
    siteUrl: (siteUrl || envSiteUrl()).replace(/\/$/, ""),
    defaultSeoImage: defaultSeoImage || null,
    defaultTitleSuffix: defaultTitleSuffix || null,
  };
}

export function withTitleSuffix(
  title: string,
  defaultTitleSuffix: string | null,
): string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return title;
  }

  const trimmedSuffix = defaultTitleSuffix?.trim();
  if (!trimmedSuffix) {
    return trimmedTitle;
  }

  return `${trimmedTitle}${trimmedSuffix}`;
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
      noIndex: boolean;
    }>
  >("/public/content/pages");

  if (!pages) {
    return [];
  }

  return pages.map((page) => ({
    slug: page.slug,
    canonicalUrl: page.canonicalUrl ?? null,
    updatedAt: page.updatedAt,
    noIndex: Boolean(page.noIndex),
  }));
}

function normalizePathSegment(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function contentItemPath(contentTypeSlug: string, slug: string): string | null {
  const normalizedContentTypeSlug = normalizePathSegment(contentTypeSlug);
  const normalizedSlug = normalizePathSegment(slug);

  if (!normalizedContentTypeSlug || !normalizedSlug) {
    return null;
  }

  return `/${normalizedContentTypeSlug}/${normalizedSlug}`;
}

function pagePath(slug: string): string | null {
  const normalizedSlug = normalizePathSegment(slug);

  if (!normalizedSlug) {
    return null;
  }

  return normalizedSlug === "home" ? "/" : `/${normalizedSlug}`;
}

export function sanitizeInternalRedirectTarget(target: string): string | null {
  const normalizedTarget = target.trim();

  if (!normalizedTarget || !normalizedTarget.startsWith("/")) {
    return null;
  }

  if (normalizedTarget.startsWith("//") || /[\r\n]/.test(normalizedTarget)) {
    return null;
  }

  try {
    const parsed = new URL(normalizedTarget, "https://internal.local");

    if (parsed.origin !== "https://internal.local") {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export async function getSitemapContentItems(): Promise<
  SitemapContentItemEntry[]
> {
  const types = await fetchContent<ApiContentType[]>("/public/content/types");
  if (!types) {
    return [];
  }

  const allItems = await Promise.all(
    types.map(async (type) => {
      const items = await fetchContent<ApiContentItem[]>(
        `/public/content/items/type-slug/${encodeURIComponent(type.slug)}`,
      );

      if (!items) {
        return [];
      }

      return items.map((item) => ({
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
    .filter((item) =>
      Boolean(
        item.canonicalUrl || contentItemPath(item.contentTypeSlug, item.slug),
      ),
    );
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

export function getContentItemPath(
  contentTypeSlug: string,
  slug: string,
): string | null {
  return contentItemPath(contentTypeSlug, slug);
}

export function getPagePath(slug: string): string | null {
  return pagePath(slug);
}

export async function getPublicNavigationTree(): Promise<NavigationTreeItem[]> {
  const items = await fetchContent<unknown[]>("/public/content/navigation-items");
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
