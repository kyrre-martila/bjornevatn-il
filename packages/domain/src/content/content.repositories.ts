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
} from "./content.entity";

export interface PagesRepository {
  findMany(): Promise<Page[]>;
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
  create(data: Omit<PageBlock, "id" | "createdAt" | "updatedAt">): Promise<PageBlock>;
  update(
    id: string,
    data: Partial<Omit<PageBlock, "id" | "createdAt" | "updatedAt">>,
  ): Promise<PageBlock>;
  delete(id: string): Promise<void>;
}

export interface ContentTypesRepository {
  findMany(): Promise<ContentType[]>;
  findById(id: string): Promise<ContentType | null>;
  findBySlug(slug: string): Promise<ContentType | null>;
  create(data: Omit<ContentType, "id" | "createdAt" | "updatedAt">): Promise<ContentType>;
  update(
    id: string,
    data: Partial<Omit<ContentType, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentType>;
  delete(id: string): Promise<void>;
}

export interface ContentItemsRepository {
  findMany(): Promise<ContentItem[]>;
  findManyByContentTypeId(contentTypeId: string): Promise<ContentItem[]>;
  findManyByContentTypeSlug(contentTypeSlug: string): Promise<ContentItem[]>;
  findTreeByContentTypeId(contentTypeId: string): Promise<ContentItemTreeNode[]>;
  findTreeByContentTypeSlug(contentTypeSlug: string): Promise<ContentItemTreeNode[]>;
  findById(id: string): Promise<ContentItem | null>;
  findBySlug(contentTypeSlug: string, slug: string): Promise<ContentItem | null>;
  findBySlugOrRedirect(
    contentTypeSlug: string,
    slug: string,
  ): Promise<SlugLookupResult<ContentItem> | null>;
  create(data: Omit<ContentItem, "id" | "createdAt" | "updatedAt">): Promise<ContentItem>;
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
  update(id: string, data: Partial<Omit<NavigationItem, "id">>): Promise<NavigationItem>;
  delete(id: string): Promise<void>;
}

export interface SiteSettingsRepository {
  findMany(): Promise<SiteSetting[]>;
  findByKey(key: string): Promise<SiteSetting | null>;
  upsert(data: SiteSetting): Promise<SiteSetting>;
  delete(key: string): Promise<void>;
}

export interface MediaRepository {
  findMany(): Promise<Media[]>;
  findById(id: string): Promise<Media | null>;
  create(data: Omit<Media, "id" | "createdAt">): Promise<Media>;
  update(id: string, data: Partial<Omit<Media, "id" | "createdAt">>): Promise<Media>;
  delete(id: string): Promise<void>;
}
