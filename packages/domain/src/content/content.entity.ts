export type Page = {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
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
