import type {
  Media,
  MediaRepository,
  NavigationItem,
  NavigationItemsRepository,
  Page,
  PagesRepository,
  Post,
  PostsRepository,
  SiteSetting,
  SiteSettingsRepository,
} from "@org/domain";
import { getPrisma } from "../prisma.client.js";

export class PagesPrismaRepository implements PagesRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Page[]> {
    return this.prisma.page.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Page | null> {
    return this.prisma.page.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Page | null> {
    return this.prisma.page.findUnique({ where: { slug } });
  }

  async create(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page> {
    return this.prisma.page.create({ data });
  }

  async update(
    id: string,
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Page> {
    return this.prisma.page.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.page.delete({ where: { id } });
  }
}

export class PostsPrismaRepository implements PostsRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Post[]> {
    return this.prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Post | null> {
    return this.prisma.post.findUnique({ where: { slug } });
  }

  async create(data: Omit<Post, "id" | "createdAt">): Promise<Post> {
    return this.prisma.post.create({ data });
  }

  async update(id: string, data: Partial<Omit<Post, "id" | "createdAt">>): Promise<Post> {
    return this.prisma.post.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }
}

export class NavigationItemsPrismaRepository implements NavigationItemsRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<NavigationItem[]> {
    return this.prisma.navigationItem.findMany({ orderBy: { order: "asc" } });
  }

  async findById(id: string): Promise<NavigationItem | null> {
    return this.prisma.navigationItem.findUnique({ where: { id } });
  }

  async create(data: Omit<NavigationItem, "id">): Promise<NavigationItem> {
    return this.prisma.navigationItem.create({ data });
  }

  async update(id: string, data: Partial<Omit<NavigationItem, "id">>): Promise<NavigationItem> {
    return this.prisma.navigationItem.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.navigationItem.delete({ where: { id } });
  }
}

export class SiteSettingsPrismaRepository implements SiteSettingsRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<SiteSetting[]> {
    return this.prisma.siteSetting.findMany({ orderBy: { key: "asc" } });
  }

  async findByKey(key: string): Promise<SiteSetting | null> {
    return this.prisma.siteSetting.findUnique({ where: { key } });
  }

  async upsert(data: SiteSetting): Promise<SiteSetting> {
    return this.prisma.siteSetting.upsert({
      where: { key: data.key },
      create: data,
      update: { value: data.value },
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.siteSetting.delete({ where: { key } });
  }
}

export class MediaPrismaRepository implements MediaRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Media[]> {
    return this.prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  }

  async findById(id: string): Promise<Media | null> {
    return this.prisma.media.findUnique({ where: { id } });
  }

  async create(data: Omit<Media, "id" | "createdAt">): Promise<Media> {
    return this.prisma.media.create({ data });
  }

  async update(id: string, data: Partial<Omit<Media, "id" | "createdAt">>): Promise<Media> {
    return this.prisma.media.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.media.delete({ where: { id } });
  }
}
