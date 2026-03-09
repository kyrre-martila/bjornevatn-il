import type {
  Media,
  NavigationItem,
  Page,
  Post,
  SiteSetting,
} from "./content.entity";

export interface PagesRepository {
  findMany(): Promise<Page[]>;
  findById(id: string): Promise<Page | null>;
  findBySlug(slug: string): Promise<Page | null>;
  create(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page>;
  update(
    id: string,
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Page>;
  delete(id: string): Promise<void>;
}

export interface PostsRepository {
  findMany(): Promise<Post[]>;
  findById(id: string): Promise<Post | null>;
  findBySlug(slug: string): Promise<Post | null>;
  create(data: Omit<Post, "id" | "createdAt">): Promise<Post>;
  update(id: string, data: Partial<Omit<Post, "id" | "createdAt">>): Promise<Post>;
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
