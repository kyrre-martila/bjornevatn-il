export type SeoFields = {
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

export type SlugLookupResult<T> =
  | { kind: "current"; entity: T }
  | { kind: "redirect"; destinationSlug: string };

export type WorkflowStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export type Page = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
  workflowStatus: WorkflowStatus;
  publishAt: Date | null;
  unpublishAt: Date | null;
  templateKey: string | null;
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
export type PageBlockType =
  | "hero"
  | "rich_text"
  | "cta"
  | "image"
  | "news_list";

export type PageRevision = {
  id: string;
  pageId: string;
  snapshot: Record<string, unknown>;
  revisionNote: string | null;
  createdById: string | null;
  createdAt: Date;
};

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
  isPublic: boolean;
  fields: ContentFieldDefinition[];
  templateKey: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ContentFieldType =
  | "text"
  | "textarea"
  | "rich_text"
  | "image"
  | "relation"
  | "media"
  | "contentItem"
  | "page"
  | "date"
  | "boolean";

export type ContentFieldRelationTargetType = "contentType" | "page" | "media";

export type ContentFieldRelationConfig = {
  targetType: ContentFieldRelationTargetType;
  targetSlug?: string;
  targetModel?: string;
  multiple?: boolean;
};

export type ResolvedContentFieldReferenceValue =
  | ContentItem
  | Page
  | Media
  | null;

export type ContentFieldDefinition = {
  key: string;
  label?: string;
  description?: string;
  placeholder?: string;
  helpText?: string;
  type: ContentFieldType;
  required: boolean;
  relation?: ContentFieldRelationConfig;
};

export type ResolvedContentFieldReference = {
  targetType: "contentItem" | "page" | "media";
  multiple?: boolean;
  value:
    | ResolvedContentFieldReferenceValue
    | ResolvedContentFieldReferenceValue[];
};

export type ContentItem = {
  id: string;
  contentTypeId: string;
  parentId: string | null;
  sortOrder: number;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  data: Record<string, unknown>;
  resolvedReferences?: Record<string, ResolvedContentFieldReference>;
  published: boolean;
  workflowStatus: WorkflowStatus;
  publishAt: Date | null;
  unpublishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Term = {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  createdAt: Date;
};

export type ContentItemTerm = {
  contentItemId: string;
  termId: string;
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
  width: number | null;
  height: number | null;
  mimeType: string | null;
  sizeBytes: number | null;
  originalFilename: string | null;
  storageKey: string | null;
  createdAt: Date;
};

export type ContentItemRevision = {
  id: string;
  contentItemId: string;
  snapshot: Record<string, unknown>;
  revisionNote: string | null;
  createdById: string | null;
  createdAt: Date;
};

export type ContentItemTreeNode = ContentItem & {
  children: ContentItemTreeNode[];
};
