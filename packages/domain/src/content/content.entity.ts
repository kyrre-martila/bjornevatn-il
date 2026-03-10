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

export type ContentType = {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: ContentFieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
};

export type ContentFieldType =
  | "text"
  | "textarea"
  | "rich_text"
  | "image"
  | "date"
  | "boolean";

export type ContentFieldDefinition = {
  key: string;
  label: string;
  type: ContentFieldType;
  required: boolean;
};

export type ContentItem = {
  id: string;
  contentTypeId: string;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  storageKey: string | null;
  createdAt: Date;
};
