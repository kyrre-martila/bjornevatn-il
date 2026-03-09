export type Page = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  blocks: PageBlock[];
};

// Initial block type convention:
// - hero
// - rich_text
// - cta
// - image
// - news_list
export type PageBlockType = "hero" | "rich_text" | "cta" | "image" | "news_list";

export type PageBlock = {
  id: string;
  pageId: string;
  type: PageBlockType;
  data: Record<string, unknown>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  parentId: string | null;
};

export type SiteSetting = {
  key: string;
  value: string;
};

export type Media = {
  id: string;
  url: string;
  alt: string;
  createdAt: Date;
};
