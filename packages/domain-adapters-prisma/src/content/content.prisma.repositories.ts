import { DomainError } from "@org/domain";
import type {
  ContentItem,
  ContentItemsRepository,
  ContentItemTreeNode,
  ContentType,
  ContentFieldDefinition,
  ContentFieldType,
  ContentTypesRepository,
  Media,
  MediaRepository,
  Taxonomy,
  Term,
  ContentItemTerm,
  TaxonomiesRepository,
  TermsRepository,
  ContentItemTermsRepository,
  NavigationItem,
  NavigationItemsRepository,
  Page,
  PageBlock,
  PageBlockType,
  PageBlocksRepository,
  PagesRepository,
  SiteSetting,
  SiteSettingsRepository,
} from "@org/domain";
import { getPrisma } from "../prisma.client.js";

const PAGE_BLOCK_TYPES: PageBlockType[] = [
  "hero",
  "rich_text",
  "cta",
  "image",
  "news_list",
];

function toPageBlockType(value: string): PageBlockType {
  return PAGE_BLOCK_TYPES.includes(value as PageBlockType)
    ? (value as PageBlockType)
    : "rich_text";
}

function mapPageBlock(block: {
  id: string;
  pageId: string;
  type: string;
  data: unknown;
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
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  blocks: Array<{
    id: string;
    pageId: string;
    type: string;
    data: unknown;
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
    data: block.data as any,
    order: block.order,
  }));
}

const CONTENT_FIELD_TYPES: ContentFieldType[] = [
  "text",
  "textarea",
  "rich_text",
  "image",
  "date",
  "boolean",
];

function toContentFieldType(value: unknown): ContentFieldType {
  return typeof value === "string" &&
    CONTENT_FIELD_TYPES.includes(value as ContentFieldType)
    ? (value as ContentFieldType)
    : "text";
}

function mapContentFields(fields: unknown): ContentFieldDefinition[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)) {
        return null;
      }

      const record = field as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const label = typeof record.label === "string" ? record.label.trim() : "";

      if (!key || !label) {
        return null;
      }

      return {
        key,
        label,
        type: toContentFieldType(record.type),
        required: Boolean(record.required),
      } satisfies ContentFieldDefinition;
    })
    .filter((field): field is ContentFieldDefinition => Boolean(field));
}

function mapContentType(type: {
  id: string;
  name: string;
  slug: string;
  description: string;
  fields: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ContentType {
  return {
    ...type,
    fields: mapContentFields(type.fields),
  };
}

function mapContentItem(item: {
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
  data: unknown;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ContentItem {
  return {
    ...item,
    data:
      item.data && typeof item.data === "object" && !Array.isArray(item.data)
        ? (item.data as Record<string, unknown>)
        : {},
  };
}

function mapContentItemTree(items: ContentItem[]): ContentItemTreeNode[] {
  const nodes = new Map<string, ContentItemTreeNode>();
  const roots: ContentItemTreeNode[] = [];

  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = nodes.get(item.id)!;
    if (!item.parentId) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(item.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  const sortTree = (entries: ContentItemTreeNode[]) => {
    entries.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    for (const entry of entries) {
      sortTree(entry.children);
    }
  };

  sortTree(roots);
  return roots;
}

function mapTaxonomy(taxonomy: {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}): Taxonomy {
  return taxonomy;
}

function mapTerm(term: {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  createdAt: Date;
}): Term {
  return term;
}

function mapContentItemTerm(entry: {
  contentItemId: string;
  termId: string;
}): ContentItemTerm {
  return entry;
}

function mapMedia(media: {
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
}): Media {
  return media;
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

  async findBySlugOrRedirect(slug: string) {
    const current = await this.findBySlug(slug);
    if (current) {
      return { kind: "current" as const, entity: current };
    }

    const redirect = await this.prisma.pageSlugRedirect.findUnique({
      where: { sourceSlug: slug },
      include: {
        page: {
          include: { blocks: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!redirect) {
      return null;
    }

    return { kind: "redirect" as const, destinationSlug: redirect.page.slug };
  }

  async create(
    data: Omit<Page, "id" | "createdAt" | "updatedAt">,
  ): Promise<Page> {
    const redirectConflict = await this.prisma.pageSlugRedirect.findUnique({
      where: { sourceSlug: data.slug },
      select: { id: true },
    });
    if (redirectConflict) {
      throw new DomainError(
        "DUPLICATE_RESOURCE",
        "Slug is already used as a redirect source.",
      );
    }

    const page = await this.prisma.page.create({
      data: {
        slug: data.slug,
        title: data.title,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        seoImage: data.seoImage,
        canonicalUrl: data.canonicalUrl,
        noIndex: data.noIndex,
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

    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.page.findUnique({ where: { id } });
      if (!existing) {
        throw new DomainError("VALIDATION_ERROR", "Page not found.");
      }

      const nextSlug =
        typeof pageData.slug === "string" ? pageData.slug : existing.slug;

      if (nextSlug !== existing.slug) {
        const activeConflict = await tx.page.findFirst({
          where: { slug: nextSlug, id: { not: id } },
          select: { id: true },
        });
        if (activeConflict) {
          throw new DomainError(
            "DUPLICATE_RESOURCE",
            "Slug is already in use by another page.",
          );
        }

        const redirectConflict = await tx.pageSlugRedirect.findFirst({
          where: { sourceSlug: nextSlug, pageId: { not: id } },
          select: { id: true },
        });
        if (redirectConflict) {
          throw new DomainError(
            "DUPLICATE_RESOURCE",
            "Slug is already used as a redirect source.",
          );
        }

        await tx.pageSlugRedirect.deleteMany({
          where: { pageId: id, sourceSlug: nextSlug },
        });

        const existingRedirect = await tx.pageSlugRedirect.findUnique({
          where: { sourceSlug: existing.slug },
          select: { id: true },
        });

        if (!existingRedirect) {
          await tx.pageSlugRedirect.create({
            data: { pageId: id, sourceSlug: existing.slug },
          });
        }
      }

      if (blocks) {
        await tx.pageBlock.deleteMany({ where: { pageId: id } });
      }

      const page = await tx.page.update({
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
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.page.delete({ where: { id } });
  }
}

export class PageBlocksPrismaRepository implements PageBlocksRepository {
  private readonly prisma = getPrisma();

  async findManyByPageId(pageId: string): Promise<PageBlock[]> {
    const blocks = await this.prisma.pageBlock.findMany({
      where: { pageId },
      orderBy: { order: "asc" },
    });
    return blocks.map(mapPageBlock);
  }

  async create(
    data: Omit<PageBlock, "id" | "createdAt" | "updatedAt">,
  ): Promise<PageBlock> {
    const block = await this.prisma.pageBlock.create({
      data: {
        ...data,
        data: data.data as any,
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
        data: data.data ? (data.data as any) : undefined,
      },
    });
    return mapPageBlock(block);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pageBlock.delete({ where: { id } });
  }
}

export class ContentTypesPrismaRepository implements ContentTypesRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<ContentType[]> {
    const types = await this.prisma.contentType.findMany({
      orderBy: { createdAt: "desc" },
    });
    return types.map(mapContentType);
  }

  async findById(id: string): Promise<ContentType | null> {
    const type = await this.prisma.contentType.findUnique({ where: { id } });
    return type ? mapContentType(type) : null;
  }

  async findBySlug(slug: string): Promise<ContentType | null> {
    const type = await this.prisma.contentType.findUnique({ where: { slug } });
    return type ? mapContentType(type) : null;
  }

  async create(
    data: Omit<ContentType, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentType> {
    const type = await this.prisma.contentType.create({
      data: {
        ...data,
        fields: data.fields as any,
      },
    });
    return mapContentType(type);
  }

  async update(
    id: string,
    data: Partial<Omit<ContentType, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentType> {
    const type = await this.prisma.contentType.update({
      where: { id },
      data: {
        ...data,
        fields: data.fields ? (data.fields as any) : undefined,
      },
    });
    return mapContentType(type);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentType.delete({ where: { id } });
  }
}

export class ContentItemsPrismaRepository implements ContentItemsRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map(mapContentItem);
  }

  async findManyByContentTypeId(contentTypeId: string): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      where: { contentTypeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map(mapContentItem);
  }

  async findManyByContentTypeSlug(
    contentTypeSlug: string,
  ): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      where: { contentType: { slug: contentTypeSlug } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map(mapContentItem);
  }

  async findTreeByContentTypeId(
    contentTypeId: string,
  ): Promise<ContentItemTreeNode[]> {
    const items = await this.findManyByContentTypeId(contentTypeId);
    return mapContentItemTree(items);
  }

  async findTreeByContentTypeSlug(
    contentTypeSlug: string,
  ): Promise<ContentItemTreeNode[]> {
    const items = await this.findManyByContentTypeSlug(contentTypeSlug);
    return mapContentItemTree(items);
  }

  async findById(id: string): Promise<ContentItem | null> {
    const item = await this.prisma.contentItem.findUnique({ where: { id } });
    return item ? mapContentItem(item) : null;
  }

  async findBySlug(
    contentTypeSlug: string,
    slug: string,
  ): Promise<ContentItem | null> {
    const item = await this.prisma.contentItem.findFirst({
      where: { slug, contentType: { slug: contentTypeSlug } },
    });
    return item ? mapContentItem(item) : null;
  }

  async findBySlugOrRedirect(contentTypeSlug: string, slug: string) {
    const current = await this.findBySlug(contentTypeSlug, slug);
    if (current) {
      return { kind: "current" as const, entity: current };
    }

    const redirect = await this.prisma.contentItemSlugRedirect.findFirst({
      where: { sourceSlug: slug, contentType: { slug: contentTypeSlug } },
      include: { contentItem: true },
    });

    if (!redirect) {
      return null;
    }

    return {
      kind: "redirect" as const,
      destinationSlug: redirect.contentItem.slug,
    };
  }

  async create(
    data: Omit<ContentItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentItem> {
    const redirectConflict =
      await this.prisma.contentItemSlugRedirect.findFirst({
        where: { contentTypeId: data.contentTypeId, sourceSlug: data.slug },
        select: { id: true },
      });
    if (redirectConflict) {
      throw new DomainError(
        "DUPLICATE_RESOURCE",
        "Slug is already used as a redirect source.",
      );
    }

    const item = await this.prisma.contentItem.create({
      data: {
        ...data,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
        data: data.data as any,
      },
    });
    return mapContentItem(item);
  }

  async update(
    id: string,
    data: Partial<Omit<ContentItem, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentItem> {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.contentItem.findUnique({ where: { id } });
      if (!existing) {
        throw new DomainError("VALIDATION_ERROR", "Content item not found.");
      }

      const nextSlug =
        typeof data.slug === "string" ? data.slug : existing.slug;
      const nextContentTypeId = data.contentTypeId ?? existing.contentTypeId;

      if (
        nextSlug !== existing.slug ||
        nextContentTypeId !== existing.contentTypeId
      ) {
        const activeConflict = await tx.contentItem.findFirst({
          where: {
            id: { not: id },
            contentTypeId: nextContentTypeId,
            slug: nextSlug,
          },
          select: { id: true },
        });
        if (activeConflict) {
          throw new DomainError(
            "DUPLICATE_RESOURCE",
            "Slug is already in use by another content item.",
          );
        }

        const redirectConflict = await tx.contentItemSlugRedirect.findFirst({
          where: {
            contentTypeId: nextContentTypeId,
            sourceSlug: nextSlug,
            contentItemId: { not: id },
          },
          select: { id: true },
        });
        if (redirectConflict) {
          throw new DomainError(
            "DUPLICATE_RESOURCE",
            "Slug is already used as a redirect source.",
          );
        }

        await tx.contentItemSlugRedirect.deleteMany({
          where: {
            contentItemId: id,
            contentTypeId: nextContentTypeId,
            sourceSlug: nextSlug,
          },
        });

        const existingRedirect = await tx.contentItemSlugRedirect.findFirst({
          where: {
            contentTypeId: existing.contentTypeId,
            sourceSlug: existing.slug,
          },
          select: { id: true },
        });

        if (!existingRedirect) {
          await tx.contentItemSlugRedirect.create({
            data: {
              contentItemId: id,
              contentTypeId: existing.contentTypeId,
              sourceSlug: existing.slug,
            },
          });
        }
      }

      const item = await tx.contentItem.update({
        where: { id },
        data: {
          ...data,
          parentId: data.parentId === undefined ? undefined : data.parentId,
          sortOrder: data.sortOrder,
          data: data.data ? (data.data as any) : undefined,
        },
      });
      return mapContentItem(item);
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentItem.delete({ where: { id } });
  }
}

export class TaxonomiesPrismaRepository implements TaxonomiesRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Taxonomy[]> {
    const taxonomies = await this.prisma.taxonomy.findMany({
      orderBy: { createdAt: "desc" },
    });
    return taxonomies.map(mapTaxonomy);
  }

  async findById(id: string): Promise<Taxonomy | null> {
    const taxonomy = await this.prisma.taxonomy.findUnique({ where: { id } });
    return taxonomy ? mapTaxonomy(taxonomy) : null;
  }

  async create(
    data: Omit<Taxonomy, "id" | "createdAt" | "updatedAt">,
  ): Promise<Taxonomy> {
    const taxonomy = await this.prisma.taxonomy.create({ data });
    return mapTaxonomy(taxonomy);
  }

  async update(
    id: string,
    data: Partial<Omit<Taxonomy, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Taxonomy> {
    const taxonomy = await this.prisma.taxonomy.update({ where: { id }, data });
    return mapTaxonomy(taxonomy);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.taxonomy.delete({ where: { id } });
  }
}

export class TermsPrismaRepository implements TermsRepository {
  private readonly prisma = getPrisma();

  async findMany(): Promise<Term[]> {
    const terms = await this.prisma.term.findMany({
      orderBy: { createdAt: "desc" },
    });
    return terms.map(mapTerm);
  }

  async findManyByTaxonomyId(taxonomyId: string): Promise<Term[]> {
    const terms = await this.prisma.term.findMany({
      where: { taxonomyId },
      orderBy: [{ createdAt: "desc" }],
    });
    return terms.map(mapTerm);
  }

  async findById(id: string): Promise<Term | null> {
    const term = await this.prisma.term.findUnique({ where: { id } });
    return term ? mapTerm(term) : null;
  }

  async create(data: Omit<Term, "id" | "createdAt">): Promise<Term> {
    const term = await this.prisma.term.create({
      data: {
        ...data,
        parentId: data.parentId ?? null,
      },
    });
    return mapTerm(term);
  }

  async update(
    id: string,
    data: Partial<Omit<Term, "id" | "createdAt">>,
  ): Promise<Term> {
    const term = await this.prisma.term.update({ where: { id }, data });
    return mapTerm(term);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.term.delete({ where: { id } });
  }
}

export class ContentItemTermsPrismaRepository
  implements ContentItemTermsRepository
{
  private readonly prisma = getPrisma();

  async findManyByContentItemId(
    contentItemId: string,
  ): Promise<ContentItemTerm[]> {
    const entries = await this.prisma.contentItemTerm.findMany({
      where: { contentItemId },
      orderBy: { termId: "asc" },
    });
    return entries.map(mapContentItemTerm);
  }

  async assign(
    contentItemId: string,
    termIds: string[],
  ): Promise<ContentItemTerm[]> {
    return this.prisma.$transaction(async (tx: any) => {
      await tx.contentItemTerm.deleteMany({ where: { contentItemId } });
      if (termIds.length > 0) {
        await tx.contentItemTerm.createMany({
          data: termIds.map((termId) => ({ contentItemId, termId })),
          skipDuplicates: true,
        });
      }
      const entries = await tx.contentItemTerm.findMany({
        where: { contentItemId },
      });
      return entries.map(mapContentItemTerm);
    });
  }

  async remove(contentItemId: string, termId: string): Promise<void> {
    await this.prisma.contentItemTerm.delete({
      where: { contentItemId_termId: { contentItemId, termId } },
    });
  }
}

export class NavigationItemsPrismaRepository
  implements NavigationItemsRepository
{
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

  async update(
    id: string,
    data: Partial<Omit<NavigationItem, "id">>,
  ): Promise<NavigationItem> {
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
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: "desc" },
    });
    return media.map(mapMedia);
  }

  async findById(id: string): Promise<Media | null> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    return media ? mapMedia(media) : null;
  }

  async create(data: Omit<Media, "id" | "createdAt">): Promise<Media> {
    const media = await this.prisma.media.create({ data });
    return mapMedia(media);
  }

  async update(
    id: string,
    data: Partial<Omit<Media, "id" | "createdAt">>,
  ): Promise<Media> {
    const media = await this.prisma.media.update({ where: { id }, data });
    return mapMedia(media);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.media.delete({ where: { id } });
  }
}
