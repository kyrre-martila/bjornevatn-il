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

export type ContentPage = {
  slug: string;
  title: string;
  intro: string;
  body: string[];
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
    intro:
      "This is a generic content page rendered through a content accessor.",
    body: [
      "The page route is intentionally generic so editors can publish future static pages.",
      "In a later phase, this content will be loaded from a CMS-backed content repository.",
    ],
  },
};

export async function getPageContentBySlug(
  slug: string,
): Promise<ContentPage | null> {
  return pageContentBySlug[slug] ?? null;
}
