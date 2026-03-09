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

export async function getHomepageContent(): Promise<HeroContent> {
  return {
    eyebrow: "Blueprint website",
    title: "A content-first foundation for your public website",
    subtitle:
      "This route is prepared to read published content from a future CMS layer instead of hardcoded route markup.",
    primaryCta: { href: "/news", label: "Read latest news" },
    secondaryCta: { href: "/page/about", label: "Open generic page" },
  };
}

export async function getNewsListing(): Promise<NewsItem[]> {
  return [
    {
      slug: "launch-update",
      title: "Launch update",
      summary:
        "Initial website architecture is now split into public and admin areas.",
      publishedAt: "2026-01-10",
    },
    {
      slug: "content-layer-plan",
      title: "Content layer plan",
      summary:
        "Routes now depend on content-access functions to ease CMS integration later.",
      publishedAt: "2026-01-18",
    },
  ];
}

const pageContentBySlug: Record<string, ContentPage> = {
  about: {
    slug: "about",
    title: "About",
    blocks: [
      {
        id: "about-hero",
        type: "hero",
        order: 0,
        data: {
          eyebrow: "About Blueprint",
          title: "Composable page blocks for public content",
          subtitle:
            "This page is rendered from ordered blocks to prepare for CMS-managed pages.",
          primaryCta: { href: "/news", label: "Read latest news" },
          secondaryCta: { href: "/", label: "Go to homepage" },
        },
      },
      {
        id: "about-intro",
        type: "rich_text",
        order: 10,
        data: {
          paragraphs: [
            "This is a generic content page rendered through a block renderer.",
            "The route fetches a page payload with blocks, sorts by order, then maps each block to a presentational component.",
            "In a later phase, this content will be loaded from a CMS-backed content repository.",
          ],
        },
      },
      {
        id: "about-image",
        type: "image",
        order: 20,
        data: {
          src: "/brand/blueprint-logo-horizontal.svg",
          alt: "Blueprint horizontal logo",
          caption: "Static assets can already be referenced from block data.",
        },
      },
      {
        id: "about-cta",
        type: "cta",
        order: 30,
        data: {
          title: "Need a public content foundation?",
          description: "Start with reusable blocks and keep the admin UI focused.",
          href: "/login",
          label: "Admin login",
        },
      },
      {
        id: "about-news",
        type: "news_list",
        order: 40,
        data: {
          title: "Latest updates",
          count: 2,
        },
      },
    ],
  },
};

export async function getPageContentBySlug(slug: string): Promise<ContentPage | null> {
  const page = pageContentBySlug[slug];
  if (!page) {
    return null;
  }

  return {
    ...page,
    blocks: [...page.blocks].sort((a, b) => a.order - b.order),
  };
}
