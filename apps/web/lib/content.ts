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

const EXAMPLE_NEWS_ITEMS: NewsItem[] = [
  {
    slug: "moren-launch-update",
    title: "Moren Ipsum launch update",
    summary:
      "Moren ipsum dolor sit amet, consectetuer adipiscing elit. Moren donec quam felis, ultricies nec, pellentesque eu.",
    publishedAt: "2026-01-04",
  },
  {
    slug: "studio-behind-the-scenes",
    title: "Behind the scenes in the Moren studio",
    summary:
      "Moren ipsum aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
    publishedAt: "2025-12-19",
  },
  {
    slug: "service-roadmap",
    title: "Service roadmap highlights",
    summary:
      "Moren ipsum donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut.",
    publishedAt: "2025-11-28",
  },
];

const EXAMPLE_PAGES: ContentPage[] = [
  {
    slug: "home",
    title: "Home",
    blocks: [
      {
        id: "example-home-hero",
        type: "hero",
        order: 1,
        data: {
          eyebrow: "Moren Studio",
          title: "Believable website blueprint",
          subtitle:
            "Moren ipsum dolor sit amet, consectetuer adipiscing elit. Moren aenean commodo ligula eget dolor.",
          primaryCta: { href: "/page/services", label: "Explore services" },
          secondaryCta: { href: "/page/contact", label: "Contact us" },
        },
      },
      {
        id: "example-home-rich-text",
        type: "rich_text",
        order: 2,
        data: {
          paragraphs: [
            "Moren ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Moren aenean massa.",
            "Moren ipsum cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
          ],
        },
      },
      {
        id: "example-home-image",
        type: "image",
        order: 3,
        data: {
          src: "https://picsum.photos/seed/moren-home/1280/720",
          alt: "Moren ipsum creative workspace",
          caption:
            "Moren ipsum donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
        },
      },
      {
        id: "example-home-cta",
        type: "cta",
        order: 4,
        data: {
          title: "Start your Moren project",
          description:
            "Moren ipsum nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.",
          href: "/page/contact",
          label: "Book a consultation",
        },
      },
      {
        id: "example-home-news-list",
        type: "news_list",
        order: 5,
        data: {
          title: "Latest updates",
          count: 3,
        },
      },
    ],
  },
  {
    slug: "about",
    title: "About",
    blocks: [
      {
        id: "example-about-rich-text",
        type: "rich_text",
        order: 1,
        data: {
          paragraphs: [
            "Moren ipsum dolor sit amet, consectetuer adipiscing elit. Moren team builds practical digital experiences.",
            "Moren ipsum phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet.",
          ],
        },
      },
      {
        id: "example-about-image",
        type: "image",
        order: 2,
        data: {
          src: "https://picsum.photos/seed/moren-about/1200/675",
          alt: "Moren ipsum team collaboration",
        },
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    blocks: [
      {
        id: "example-services-rich-text",
        type: "rich_text",
        order: 1,
        data: {
          paragraphs: [
            "Moren ipsum aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante.",
            "Moren ipsum dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet.",
          ],
        },
      },
      {
        id: "example-services-cta",
        type: "cta",
        order: 2,
        data: {
          title: "Need a custom scope?",
          description: "Moren ipsum maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero.",
          href: "/page/contact",
          label: "Request proposal",
        },
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    blocks: [
      {
        id: "example-contact-rich-text",
        type: "rich_text",
        order: 1,
        data: {
          paragraphs: [
            "Moren ipsum donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros.",
            "Moren ipsum email: hello@example.com · phone: +1 (555) 010-2400 · hours: Monday to Friday, 9:00–17:00.",
          ],
        },
      },
    ],
  },
];

const EXAMPLE_PAGE_BY_SLUG = new Map(EXAMPLE_PAGES.map((page) => [page.slug, page]));

const PUBLIC_SITE_SETTING_KEYS: SiteSettingKey[] = [
  "site_title",
  "site_tagline",
  "logo_url",
  "footer_text",
  "facebook_url",
  "instagram_url",
  "youtube_url",
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

function mapApiContentItem(item: ApiContentItem): NewsItem {
  const data = asRecord(item.data);
  const publishedAt = typeof data.publishedAt === "string" ? data.publishedAt : item.updatedAt;

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
    const fallbackPage = EXAMPLE_PAGE_BY_SLUG.get("home");
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
  return hero ?? {
    eyebrow: "",
    title: apiPage.title,
    subtitle: "",
    primaryCta: { href: "/news", label: "News" },
    secondaryCta: { href: "/", label: "Home" },
  };
}

export async function getNewsListing(): Promise<NewsItem[]> {
  const items = await fetchContent<ApiContentItem[]>("/content/items/type-slug/news");
  if (!items) {
    return EXAMPLE_NEWS_ITEMS;
  }

  return items.map(mapApiContentItem);
}

export async function getPageContentBySlug(slug: string): Promise<ContentPage | null> {
  const page = await fetchContent<ApiPage>(`/content/pages/slug/${encodeURIComponent(slug)}`);
  if (!page || !page.published) {
    return EXAMPLE_PAGE_BY_SLUG.get(slug) ?? null;
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
    return buildNavigationTree([
      { id: "nav-home", label: "Home", url: "/", order: 1, parentId: null },
      { id: "nav-about", label: "About", url: "/page/about", order: 2, parentId: null },
      { id: "nav-services", label: "Services", url: "/page/services", order: 3, parentId: null },
      { id: "nav-contact", label: "Contact", url: "/page/contact", order: 4, parentId: null },
    ]);
  }

  const mappedItems = items
    .map(mapNavigationItem)
    .filter((item): item is NavigationItem => item !== null);

  if (mappedItems.length === 0) {
    return buildNavigationTree([
      { id: "nav-home", label: "Home", url: "/", order: 1, parentId: null },
      { id: "nav-about", label: "About", url: "/page/about", order: 2, parentId: null },
      { id: "nav-services", label: "Services", url: "/page/services", order: 3, parentId: null },
      { id: "nav-contact", label: "Contact", url: "/page/contact", order: 4, parentId: null },
    ]);
  }

  return buildNavigationTree(mappedItems);
}
