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

export type Redirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  createdAt: Date;
  updatedAt: Date;
};


export type SiteEnvironmentName = "live" | "staging";

export type SiteEnvironmentState = "active" | "stale" | "deleted";

export type SiteEnvironmentLockStatus =
  | "idle"
  | "syncing"
  | "pushing"
  | "deleting";

export type SiteEnvironmentStatus = {
  environment: SiteEnvironmentName;
  state: SiteEnvironmentState;
  lastSyncedAt: Date | null;
  lastPushedAt: Date | null;
  lastResetAt: Date | null;
  lockStatus: SiteEnvironmentLockStatus;
  lastActorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type SiteSetting = {
  key: string;
  value: string;
};

export type Media = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  url: string;
  storageKey: string | null;
  altText: string | null;
  caption: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants?: Record<string, { url: string; width?: number; height?: number }>;
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
