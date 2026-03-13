import type {
  ContentItem,
  ContentType,
  ContentItemTreeNode,
  Media,
  NavigationItem,
  Page,
  PageBlock,
  SiteSetting,
  SlugLookupResult,
  Taxonomy,
  Term,
  ContentItemTerm,
} from "./content.entity";

export type PaginationParams = {
  offset?: number;
  limit?: number;
  published?: boolean;
};

export interface PagesRepository {
  findMany(pagination?: PaginationParams): Promise<Page[]>;
  findById(id: string): Promise<Page | null>;
  findBySlug(slug: string): Promise<Page | null>;
  findBySlugOrRedirect(slug: string): Promise<SlugLookupResult<Page> | null>;
  create(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page>;
  update(
    id: string,
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Page>;
  delete(id: string): Promise<void>;
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
    data: Partial<Omit<ContentItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentItem>;
  delete(id: string): Promise<void>;
}

export interface NavigationItemsRepository {
  findMany(): Promise<NavigationItem[]>;
  findById(id: string): Promise<NavigationItem | null>;
  create(data: Omit<NavigationItem, "id">): Promise<NavigationItem>;
  update(
    id: string,
    data: Partial<Omit<NavigationItem, "id">>,
  ): Promise<NavigationItem>;
  delete(id: string): Promise<void>;
}

export interface SiteSettingsRepository {
  findMany(): Promise<SiteSetting[]>;
  findByKey(key: string): Promise<SiteSetting | null>;
  upsert(data: SiteSetting): Promise<SiteSetting>;
  delete(key: string): Promise<void>;
}

export interface MediaRepository {
  findMany(pagination?: PaginationParams): Promise<Media[]>;
  findById(id: string): Promise<Media | null>;
  create(data: Omit<Media, "id" | "createdAt">): Promise<Media>;
  update(
    id: string,
    data: Partial<Omit<Media, "id" | "createdAt">>,
  ): Promise<Media>;
  delete(id: string): Promise<void>;
}

export interface TaxonomiesRepository {
  findMany(): Promise<Taxonomy[]>;
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
  findMany(): Promise<Term[]>;
  findManyByTaxonomyId(taxonomyId: string): Promise<Term[]>;
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
