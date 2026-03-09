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

export type RenderablePageSection =
  | { kind: "rich_text"; paragraphs: string[] }
  | { kind: "unsupported"; blockType: ContentBlockType };

export type RenderablePageContent = {
  slug: string;
  title: string;
  intro: string;
  body: string[];
  sections: RenderablePageSection[];
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
        id: "about-intro",
        type: "rich_text",
        order: 0,
        data: {
          paragraphs: [
            "This is a generic content page rendered through a content accessor.",
            "The page route is intentionally generic so editors can publish future static pages.",
            "In a later phase, this content will be loaded from a CMS-backed content repository.",
          ],
        },
      },
    ],
  },
};

function mapPageToRenderableContent(page: ContentPage): RenderablePageContent {
  const orderedBlocks = [...page.blocks].sort((a, b) => a.order - b.order);
  const sections: RenderablePageSection[] = orderedBlocks.map((block) => {
    if (block.type === "rich_text") {
      const paragraphs = Array.isArray(block.data.paragraphs)
        ? block.data.paragraphs.filter((p): p is string => typeof p === "string")
        : [];
      return { kind: "rich_text", paragraphs };
    }

    return { kind: "unsupported", blockType: block.type };
  });

  const firstRichText = sections.find((section) => section.kind === "rich_text");

  return {
    slug: page.slug,
    title: page.title,
    intro: firstRichText?.paragraphs[0] ?? "",
    body: firstRichText?.paragraphs.slice(1) ?? [],
    sections,
  };
}

export async function getPageContentBySlug(
  slug: string,
): Promise<RenderablePageContent | null> {
  const page = pageContentBySlug[slug];
  if (!page) {
    return null;
  }

  return mapPageToRenderableContent(page);
}
