import type {
  ContentItem,
  ContentType,
  ContentItemTreeNode,
  Media,
  NavigationItem,
  Redirect,
  Page,
  PageBlock,
  SiteSetting,
  SiteEnvironmentStatus,
  SiteEnvironmentName,
  SiteEnvironmentState,
  SiteEnvironmentLockStatus,
  SlugLookupResult,
  Taxonomy,
  Term,
  ContentItemTerm,
  PageRevision,
  ContentItemRevision,
} from "./content.entity";

export type PaginationParams = {
  offset?: number;
  limit?: number;
  cursor?: string;
  published?: boolean;
};

export type RevisionPaginationResult<T> = {
  items: T[];
  nextCursor: string | null;
};

export type RevisionWriteMetadata = {
  updatedById?: string | null;
  revisionNote?: string | null;
};

export interface PagesRepository {
  findMany(pagination?: PaginationParams): Promise<Page[]>;
  findById(id: string): Promise<Page | null>;
  findManyByIds(ids: string[]): Promise<Page[]>;
  findBySlug(slug: string): Promise<Page | null>;
  findBySlugOrRedirect(slug: string): Promise<SlugLookupResult<Page> | null>;
  create(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page>;
  update(
    id: string,
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">> &
      RevisionWriteMetadata,
  ): Promise<Page>;
  delete(id: string): Promise<void>;
  listRevisions(
    pageId: string,
    pagination?: PaginationParams,
  ): Promise<RevisionPaginationResult<PageRevision>>;
  findRevisionById(
    pageId: string,
    revisionId: string,
  ): Promise<PageRevision | null>;
  restoreRevision(
    pageId: string,
    revisionId: string,
    restoredById?: string | null,
    revisionNote?: string | null,
  ): Promise<Page>;
}

export interface PageBlocksRepository {
  findManyByPageId(pageId: string): Promise<PageBlock[]>;
  create(
    data: Omit<PageBlock, "id" | "createdAt" | "updatedAt">,
  ): Promise<PageBlock>;
  update(
    id: string,
    data: Partial<Omit<PageBlock, "id" | "createdAt" | "updatedAt">>,
  ): Promise<PageBlock>;
  delete(id: string): Promise<void>;
}

export interface ContentTypesRepository {
  findMany(pagination?: PaginationParams): Promise<ContentType[]>;
  findManyPublic(pagination?: PaginationParams): Promise<ContentType[]>;
  findById(id: string): Promise<ContentType | null>;
  findManyBySlugs(slugs: string[]): Promise<ContentType[]>;
  findBySlug(slug: string): Promise<ContentType | null>;
  findPublicBySlug(slug: string): Promise<ContentType | null>;
  create(
    data: Omit<ContentType, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentType>;
  update(
    id: string,
    data: Partial<Omit<ContentType, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentType>;
  delete(id: string): Promise<void>;
}

export interface ContentItemsRepository {
  findMany(pagination?: PaginationParams): Promise<ContentItem[]>;
  countByContentTypeId(contentTypeId: string): Promise<number>;
  findManyByContentTypeId(
    contentTypeId: string,
    pagination?: PaginationParams,
  ): Promise<ContentItem[]>;
  findManyByContentTypeSlug(
    contentTypeSlug: string,
    pagination?: PaginationParams,
  ): Promise<ContentItem[]>;
  findTreeByContentTypeId(
    contentTypeId: string,
  ): Promise<ContentItemTreeNode[]>;
  findTreeByContentTypeSlug(
    contentTypeSlug: string,
  ): Promise<ContentItemTreeNode[]>;
  findById(id: string): Promise<ContentItem | null>;
  findManyByIds(ids: string[]): Promise<ContentItem[]>;
  findBySlug(
    contentTypeSlug: string,
    slug: string,
  ): Promise<ContentItem | null>;
  findBySlugOrRedirect(
    contentTypeSlug: string,
    slug: string,
  ): Promise<SlugLookupResult<ContentItem> | null>;
  create(
    data: Omit<ContentItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentItem>;
  update(
    id: string,
    data: Partial<Omit<ContentItem, "id" | "createdAt" | "updatedAt">> &
      RevisionWriteMetadata,
  ): Promise<ContentItem>;
  delete(id: string): Promise<void>;
  listRevisions(
    contentItemId: string,
    pagination?: PaginationParams,
  ): Promise<RevisionPaginationResult<ContentItemRevision>>;
  findRevisionById(
    contentItemId: string,
    revisionId: string,
  ): Promise<ContentItemRevision | null>;
  restoreRevision(
    contentItemId: string,
    revisionId: string,
    restoredById?: string | null,
    revisionNote?: string | null,
  ): Promise<ContentItem>;
}

export interface NavigationItemsRepository {
  findMany(pagination?: PaginationParams): Promise<NavigationItem[]>;
  findById(id: string): Promise<NavigationItem | null>;
  create(data: Omit<NavigationItem, "id">): Promise<NavigationItem>;
  update(
    id: string,
    data: Partial<Omit<NavigationItem, "id">>,
  ): Promise<NavigationItem>;
  delete(id: string): Promise<void>;
}

export interface RedirectsRepository {
  findMany(pagination?: PaginationParams): Promise<Redirect[]>;
  findById(id: string): Promise<Redirect | null>;
  create(data: Omit<Redirect, "id" | "createdAt" | "updatedAt">): Promise<Redirect>;
  update(
    id: string,
    data: Partial<Omit<Redirect, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Redirect>;
  delete(id: string): Promise<void>;
}

export interface SiteSettingsRepository {
  findMany(pagination?: PaginationParams): Promise<SiteSetting[]>;
  findByKey(key: string): Promise<SiteSetting | null>;
  upsert(data: SiteSetting): Promise<SiteSetting>;
  delete(key: string): Promise<void>;
}

export interface MediaRepository {
  findMany(pagination?: PaginationParams): Promise<Media[]>;
  findById(id: string): Promise<Media | null>;
  findManyByIds(ids: string[]): Promise<Media[]>;
  findManyByUrls(urls: string[]): Promise<Media[]>;
  create(data: Omit<Media, "id" | "createdAt" | "updatedAt">): Promise<Media>;
  update(
    id: string,
    data: Partial<Omit<Media, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Media>;
  delete(id: string): Promise<void>;
}

export interface TaxonomiesRepository {
  findMany(pagination?: PaginationParams): Promise<Taxonomy[]>;
  findById(id: string): Promise<Taxonomy | null>;
  create(
    data: Omit<Taxonomy, "id" | "createdAt" | "updatedAt">,
  ): Promise<Taxonomy>;
  update(
    id: string,
    data: Partial<Omit<Taxonomy, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Taxonomy>;
  delete(id: string): Promise<void>;
}

export interface TermsRepository {
  findMany(pagination?: PaginationParams): Promise<Term[]>;
  findManyByTaxonomyId(
    taxonomyId: string,
    pagination?: PaginationParams,
  ): Promise<Term[]>;
  findManyByIds(ids: string[]): Promise<Term[]>;
  findById(id: string): Promise<Term | null>;
  create(data: Omit<Term, "id" | "createdAt">): Promise<Term>;
  update(
    id: string,
    data: Partial<Omit<Term, "id" | "createdAt">>,
  ): Promise<Term>;
  delete(id: string): Promise<void>;
}

export interface ContentItemTermsRepository {
  findManyByContentItemId(contentItemId: string): Promise<ContentItemTerm[]>;
  assign(contentItemId: string, termIds: string[]): Promise<ContentItemTerm[]>;
  remove(contentItemId: string, termId: string): Promise<void>;
}


export type UpdateSiteEnvironmentStatusInput = {
  state?: SiteEnvironmentState;
  lastSyncedAt?: Date | null;
  lastPushedAt?: Date | null;
  lastResetAt?: Date | null;
  lockStatus?: SiteEnvironmentLockStatus;
  lastActorUserId?: string | null;
};

export interface SiteEnvironmentStatusRepository {
  get(environment: SiteEnvironmentName): Promise<SiteEnvironmentStatus | null>;
  list(): Promise<SiteEnvironmentStatus[]>;
  upsert(status: Omit<SiteEnvironmentStatus, "createdAt" | "updatedAt">): Promise<SiteEnvironmentStatus>;
  update(environment: SiteEnvironmentName, data: UpdateSiteEnvironmentStatusInput): Promise<SiteEnvironmentStatus>;
  delete(environment: SiteEnvironmentName): Promise<void>;
}
