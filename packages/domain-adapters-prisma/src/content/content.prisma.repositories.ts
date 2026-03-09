import { Prisma } from "@prisma/client";
import type {
  Media,
  MediaRepository,
  NavigationItem,
  NavigationItemsRepository,
  Page,
  PageBlock,
  PageBlockType,
  PageBlocksRepository,
  PagesRepository,
  Post,
  PostsRepository,
  SiteSetting,
  SiteSettingsRepository,
} from "@org/domain";
import { getPrisma } from "../prisma.client.js";

const PAGE_BLOCK_TYPES: PageBlockType[] = ["hero", "rich_text", "cta", "image", "news_list"];

function toPageBlockType(value: string): PageBlockType {
  return PAGE_BLOCK_TYPES.includes(value as PageBlockType)
    ? (value as PageBlockType)
    : "rich_text";
}

function mapPageBlock(block: {
  id: string;
  pageId: string;
  type: string;
  data: Prisma.JsonValue;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}): PageBlock {
  return {
    ...block,
    type: toPageBlockType(block.type),
    data:
      block.data && typeof block.data === "object" && !Array.isArray(block.data)
        ? (block.data as Record<string, unknown>)
        : {},
  };
}

function mapPage(page: {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  blocks: Array<{
    id: string;
    pageId: string;
    type: string;
    data: Prisma.JsonValue;
    order: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): Page {
  return {
    ...page,
    blocks: page.blocks.map(mapPageBlock),
  };
}

function mapInputBlocks(blocks: PageBlock[]) {
  return blocks.map((block) => ({
    type: block.type,
    data: block.data as Prisma.InputJsonValue,
    order: block.order,
  }));
}

export class PagesPrismaRepository implements PagesRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Page[]> {
    const pages = await this.prisma.page.findMany({
      orderBy: { createdAt: "desc" },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return pages.map(mapPage);
  }

  async findById(id: string): Promise<Page | null> {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return page ? mapPage(page) : null;
  }

  async findBySlug(slug: string): Promise<Page | null> {
    const page = await this.prisma.page.findUnique({
      where: { slug },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return page ? mapPage(page) : null;
  }

  async create(data: Omit<Page, "id" | "createdAt" | "updatedAt">): Promise<Page> {
    const page = await this.prisma.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        published: data.published,
        blocks: {
          create: mapInputBlocks(data.blocks),
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    return mapPage(page);
  }

  async update(
    id: string,
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Page> {
    const { blocks, ...pageData } = data;

    if (blocks) {
      await this.prisma.pageBlock.deleteMany({ where: { pageId: id } });
    }

    const page = await this.prisma.page.update({
      where: { id },
      data: {
        ...pageData,
        blocks: blocks
          ? {
              create: mapInputBlocks(blocks),
            }
          : undefined,
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    return mapPage(page);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.page.delete({ where: { id } });
  }
}

export class PageBlocksPrismaRepository implements PageBlocksRepository {
  private readonly prisma = getPrisma();

  async findManyByPageId(pageId: string): Promise<PageBlock[]> {
    const blocks = await this.prisma.pageBlock.findMany({ where: { pageId }, orderBy: { order: "asc" } });
    return blocks.map(mapPageBlock);
  }

  async create(data: Omit<PageBlock, "id" | "createdAt" | "updatedAt">): Promise<PageBlock> {
    const block = await this.prisma.pageBlock.create({
      data: {
        ...data,
        data: data.data as Prisma.InputJsonValue,
      },
    });
    return mapPageBlock(block);
  }

  async update(
    id: string,
    data: Partial<Omit<PageBlock, "id" | "createdAt" | "updatedAt">>,
  ): Promise<PageBlock> {
    const block = await this.prisma.pageBlock.update({
      where: { id },
      data: {
        ...data,
        data: data.data ? (data.data as Prisma.InputJsonValue) : undefined,
      },
    });
    return mapPageBlock(block);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pageBlock.delete({ where: { id } });
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
