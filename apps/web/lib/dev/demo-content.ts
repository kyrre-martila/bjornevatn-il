import type { ContentPage, NavigationItem, NewsItem } from "../content";

export const DEMO_NEWS_ITEMS: NewsItem[] = [
  {
    slug: "moren-launch-update",
    title: "Moren Ipsum launch update",
    summary:
      "Moren ipsum dolor sit amet, consectetuer adipiscing elit. Moren donec quam felis, ultricies nec, pellentesque eu.",
    publishedAt: "2026-01-04",
    templateKey: "news",
    canonicalUrl: null,
    noIndex: false,
  },
  {
    slug: "studio-behind-the-scenes",
    title: "Behind the scenes in the Moren studio",
    summary:
      "Moren ipsum aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.",
    publishedAt: "2025-12-19",
    templateKey: "news",
    canonicalUrl: null,
    noIndex: false,
  },
  {
    slug: "service-roadmap",
    title: "Service roadmap highlights",
    summary:
      "Moren ipsum donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut.",
    publishedAt: "2025-11-28",
    templateKey: "news",
    canonicalUrl: null,
    noIndex: false,
  },
];

export const DEMO_PAGES: ContentPage[] = [
  {
    slug: "home",
    title: "Home",
    templateKey: "index",
    seoTitle: null,
    seoDescription: null,
    seoImage: null,
    canonicalUrl: null,
    noIndex: false,
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
          primaryCta: { href: "/services", label: "Explore services" },
          secondaryCta: { href: "/contact", label: "Contact us" },
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
          href: "/contact",
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
    templateKey: "landing",
    seoTitle: null,
    seoDescription: null,
    seoImage: null,
    canonicalUrl: null,
    noIndex: false,
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
    templateKey: "service",
    seoTitle: null,
    seoDescription: null,
    seoImage: null,
    canonicalUrl: null,
    noIndex: false,
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
          description:
            "Moren ipsum maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero.",
          href: "/contact",
          label: "Request proposal",
        },
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    templateKey: "landing",
    seoTitle: null,
    seoDescription: null,
    seoImage: null,
    canonicalUrl: null,
    noIndex: false,
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

export const DEMO_PAGE_BY_SLUG = new Map(
  DEMO_PAGES.map((page) => [page.slug, page]),
);

export const DEMO_NAVIGATION_ITEMS: NavigationItem[] = [
  { id: "nav-home", label: "Home", url: "/", order: 1, parentId: null },
  {
    id: "nav-about",
    label: "About",
    url: "/about",
    order: 2,
    parentId: null,
  },
  {
    id: "nav-services",
    label: "Services",
    url: "/services",
    order: 3,
    parentId: null,
  },
  {
    id: "nav-contact",
    label: "Contact",
    url: "/contact",
    order: 4,
    parentId: null,
  },
];
