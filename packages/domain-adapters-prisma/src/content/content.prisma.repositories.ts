import { DomainError } from "@org/domain";
import type { Prisma } from "@prisma/client";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import type {
  ContentItem,
  ContentItemsRepository,
  PaginationParams,
  ContentItemTreeNode,
  ContentType,
  ContentFieldDefinition,
  ContentFieldType,
  ContentFieldRelationTargetType,
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
  Redirect,
  RedirectsRepository,
  Page,
  PageRevision,
  ContentItemRevision,
  PageBlock,
  PageBlockType,
  PageBlocksRepository,
  PagesRepository,
  SiteSetting,
  SiteSettingsRepository,
  SiteEnvironmentName,
  SiteEnvironmentState,
  SiteEnvironmentLockStatus,
  SiteEnvironmentStatus,
  SiteEnvironmentStatusRepository,
  UpdateSiteEnvironmentStatusInput,
} from "@org/domain";
import { getPrisma } from "../prisma.client.js";

const WORKFLOW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

function normalizeWorkflowStatus(
  value: unknown,
): (typeof WORKFLOW_STATUSES)[number] {
  return typeof value === "string" &&
    WORKFLOW_STATUSES.includes(value as (typeof WORKFLOW_STATUSES)[number])
    ? (value as (typeof WORKFLOW_STATUSES)[number])
    : "draft";
}

const PAGE_BLOCK_TYPES: PageBlockType[] = [
  "hero",
  "rich_text",
  "cta",
  "image",
  "news_list",
];

const DEFAULT_PAGINATION_LIMIT = 50;
const MAX_PAGINATION_LIMIT = 100;
const REVISION_RETENTION_COUNT = 100;

function normalizePaginationLimit(limit?: number): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_PAGINATION_LIMIT;
  }

  return Math.min(MAX_PAGINATION_LIMIT, Math.max(1, Math.trunc(limit)));
}

function buildPaginationArgs(
  pagination?: PaginationParams,
  cursorField: "id" | "key" = "id",
): any {
  const take = normalizePaginationLimit(pagination?.limit);
  const cursor =
    typeof pagination?.cursor === "string" && pagination.cursor.trim()
      ? pagination.cursor.trim()
      : undefined;

  if (cursor) {
    return {
      take,
      skip: 1,
      cursor: cursorField === "key" ? { key: cursor } : { id: cursor },
    };
  }

  if (typeof pagination?.offset === "number") {
    return {
      take,
      skip: Math.max(0, Math.trunc(pagination.offset)),
    };
  }

  return { take };
}

async function pruneOlderPageRevisions(
  tx: Prisma.TransactionClient,
  pageId: string,
) {
  const revisionsToDelete = await tx.pageRevision.findMany({
    where: { pageId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: REVISION_RETENTION_COUNT,
    select: { id: true },
  });

  if (revisionsToDelete.length === 0) {
    return;
  }

  await tx.pageRevision.deleteMany({
    where: {
      id: {
        in: revisionsToDelete.map((revision: { id: string }) => revision.id),
      },
    },
  });
}

async function pruneOlderContentItemRevisions(
  tx: Prisma.TransactionClient,
  contentItemId: string,
) {
  const revisionsToDelete = await tx.contentItemRevision.findMany({
    where: { contentItemId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: REVISION_RETENTION_COUNT,
    select: { id: true },
  });

  if (revisionsToDelete.length === 0) {
    return;
  }

  await tx.contentItemRevision.deleteMany({
    where: {
      id: {
        in: revisionsToDelete.map((revision: { id: string }) => revision.id),
      },
    },
  });
}

const ROUTE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_SLUG_VALIDATION_MESSAGE =
  "Slug must contain lowercase letters, numbers, and hyphens only.";

function assertValidRouteSlug(slug: string, modelName: string): void {
  if (!ROUTE_SLUG_PATTERN.test(slug)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      `${modelName} slug '${slug}' is invalid. ${ROUTE_SLUG_VALIDATION_MESSAGE}`,
    );
  }
}

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
  workflowStatus: string;
  publishAt: Date | null;
  unpublishAt: Date | null;
  templateKey: string | null;
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
    workflowStatus: normalizeWorkflowStatus(page.workflowStatus),
    blocks: page.blocks.map(mapPageBlock),
  };
}

function mapInputBlocks(blocks: PageBlock[]) {
  return blocks.map((block) => ({
    type: block.type,
    data: block.data as InputJsonValue,
    order: block.order,
  }));
}
function mapPageRevision(revision: {
  id: string;
  pageId: string;
  snapshot: unknown;
  revisionNote: string | null;
  createdById: string | null;
  createdAt: Date;
}): PageRevision {
  return {
    ...revision,
    snapshot:
      revision.snapshot &&
      typeof revision.snapshot === "object" &&
      !Array.isArray(revision.snapshot)
        ? (revision.snapshot as Record<string, unknown>)
        : {},
  };
}

function mapContentItemRevision(revision: {
  id: string;
  contentItemId: string;
  snapshot: unknown;
  revisionNote: string | null;
  createdById: string | null;
  createdAt: Date;
}): ContentItemRevision {
  return {
    ...revision,
    snapshot:
      revision.snapshot &&
      typeof revision.snapshot === "object" &&
      !Array.isArray(revision.snapshot)
        ? (revision.snapshot as Record<string, unknown>)
        : {},
  };
}

const CONTENT_FIELD_TYPES: ContentFieldType[] = [
  "text",
  "textarea",
  "rich_text",
  "image",
  "relation",
  "media",
  "contentItem",
  "page",
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

      if (!key) {
        return null;
      }

      const labelRaw =
        typeof record.label === "string" ? record.label.trim() : "";
      const descriptionRaw =
        typeof record.description === "string" ? record.description.trim() : "";
      const placeholderRaw =
        typeof record.placeholder === "string" ? record.placeholder.trim() : "";

      const type = toContentFieldType(record.type);
      const relationValue =
        record.relation &&
        typeof record.relation === "object" &&
        !Array.isArray(record.relation)
          ? (record.relation as Record<string, unknown>)
          : null;

      const rawTargetType = relationValue?.targetType;
      const targetType: ContentFieldRelationTargetType | undefined =
        rawTargetType === "contentType" ||
        rawTargetType === "page" ||
        rawTargetType === "media"
          ? rawTargetType
          : undefined;
      const targetSlugRaw = relationValue?.targetSlug;
      const targetSlug =
        typeof targetSlugRaw === "string" && targetSlugRaw.trim()
          ? targetSlugRaw.trim()
          : undefined;
      const targetModelRaw = relationValue?.targetModel;
      const targetModel =
        typeof targetModelRaw === "string" && targetModelRaw.trim()
          ? targetModelRaw.trim()
          : undefined;
      const multiple = Boolean(relationValue?.multiple);

      const relation: ContentFieldDefinition["relation"] =
        (type === "relation" ||
          type === "media" ||
          type === "contentItem" ||
          type === "page") &&
        targetType
          ? {
              targetType,
              ...(targetSlug ? { targetSlug } : {}),
              ...(targetModel ? { targetModel } : {}),
              multiple,
            }
          : undefined;

      const mapped: ContentFieldDefinition = {
        key,
        ...(labelRaw ? { label: labelRaw } : {}),
        ...(descriptionRaw ? { description: descriptionRaw } : {}),
        ...(placeholderRaw ? { placeholder: placeholderRaw } : {}),
        type,
        required: Boolean(record.required),
        ...(relation ? { relation } : {}),
      };

      return mapped;
    })
    .filter((field): field is ContentFieldDefinition => Boolean(field));
}

function mapContentType(type: {
  id: string;
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
  fields: unknown;
  templateKey: string | null;
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
  workflowStatus: string;
  publishAt: Date | null;
  unpublishAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ContentItem {
  return {
    ...item,
    workflowStatus: normalizeWorkflowStatus(item.workflowStatus),
    data:
      item.data && typeof item.data === "object" && !Array.isArray(item.data)
        ? (item.data as Record<string, unknown>)
        : {},
  };
}

/**
 * Build a content tree in memory from the flat list returned by Prisma.
 *
 * This is intentionally in-memory for blueprint-scale usage: current content
 * collections are expected to be small enough to load in one query, while this
 * keeps the logic database-agnostic and easier to reason about than recursive
 * SQL/CTE queries. The implementation below is defensive against inconsistent
 * data (missing parents, duplicates, and parent cycles).
 */
function mapContentItemTree(items: ContentItem[]): ContentItemTreeNode[] {
  const nodes = new Map<string, ContentItemTreeNode>();
  const parentById = new Map<string, string | null>();
  for (const item of items) {
    // Guard against duplicate source rows to keep each item in the tree once.
    if (nodes.has(item.id)) {
      continue;
    }

    nodes.set(item.id, { ...item, children: [] });
    parentById.set(item.id, item.parentId);
  }

  // Parent pointer DFS (each node has at most one parent) to detect cycles.
  const visitState = new Map<string, 0 | 1 | 2>();
  const cycleNodeIds = new Set<string>();

  const detectCycle = (id: string, path: string[]) => {
    const state = visitState.get(id) ?? 0;
    if (state === 2) {
      return;
    }

    if (state === 1) {
      const cycleStart = path.indexOf(id);
      if (cycleStart >= 0) {
        for (const cycleId of path.slice(cycleStart)) {
          cycleNodeIds.add(cycleId);
        }
      }
      return;
    }

    visitState.set(id, 1);
    path.push(id);

    const parentId = parentById.get(id);
    if (parentId && nodes.has(parentId) && parentId !== id) {
      detectCycle(parentId, path);
    }

    path.pop();
    visitState.set(id, 2);
  };

  for (const id of nodes.keys()) {
    detectCycle(id, []);
  }

  const attachedNodeIds = new Set<string>();
  const roots: ContentItemTreeNode[] = [];

  for (const id of nodes.keys()) {
    const node = nodes.get(id)!;
    const parentId = parentById.get(id);

    // Any broken relationship is treated as a root-level item rather than
    // dropping content from the response.
    const hasInvalidParent = parentId ? !nodes.has(parentId) : false;
    const isSelfCycle = parentId === id;
    const isCycle = cycleNodeIds.has(id);

    if (!parentId || hasInvalidParent || isSelfCycle || isCycle) {
      roots.push(node);
      attachedNodeIds.add(id);
      continue;
    }

    const parent = nodes.get(parentId)!;
    if (attachedNodeIds.has(id)) {
      continue;
    }

    parent.children.push(node);
    attachedNodeIds.add(id);
  }

  // Deterministic ordering: explicit sortOrder, then recency, then id to avoid
  // unstable ordering when values tie.
  const sortTree = (entries: ContentItemTreeNode[]) => {
    entries.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return a.id.localeCompare(b.id);
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

  async findMany(pagination?: PaginationParams): Promise<Page[]> {
    const pages = (await this.prisma.page.findMany({
      orderBy: { createdAt: "desc" },
      include: { blocks: { orderBy: { order: "asc" } } },
      ...buildPaginationArgs(pagination),
      ...(typeof pagination?.published === "boolean"
        ? { where: { published: pagination.published } }
        : {}),
    })) as Parameters<typeof mapPage>[0][];
    return pages.map(mapPage);
  }

  async findById(id: string): Promise<Page | null> {
    const page = await this.prisma.page.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return page ? mapPage(page) : null;
  }

  async findManyByIds(ids: string[]): Promise<Page[]> {
    if (ids.length === 0) {
      return [];
    }

    const pages = await this.prisma.page.findMany({
      where: { id: { in: ids } },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    return pages.map(mapPage);
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
    assertValidRouteSlug(data.slug, "Page");

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
        workflowStatus: data.workflowStatus,
        publishAt: data.publishAt,
        unpublishAt: data.unpublishAt,
        templateKey: data.templateKey,
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
    data: Partial<Omit<Page, "id" | "createdAt" | "updatedAt">> & {
      updatedById?: string | null;
      revisionNote?: string | null;
    },
  ): Promise<Page> {
    const { blocks, updatedById, revisionNote, ...pageData } = data;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.page.findUnique({
        where: { id },
        include: { blocks: { orderBy: { order: "asc" } } },
      });
      if (!existing) {
        throw new DomainError("VALIDATION_ERROR", "Page not found.");
      }

      await tx.pageRevision.create({
        data: {
          pageId: existing.id,
          snapshot: existing as unknown as InputJsonValue,
          createdById: updatedById ?? null,
          revisionNote: revisionNote ?? null,
        },
      });

      await pruneOlderPageRevisions(tx, existing.id);

      const nextSlug =
        typeof pageData.slug === "string" ? pageData.slug : existing.slug;

      assertValidRouteSlug(nextSlug, "Page");

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

  async listRevisions(
    pageId: string,
    pagination?: PaginationParams,
  ): Promise<{ items: PageRevision[]; nextCursor: string | null }> {
    const limit = normalizePaginationLimit(pagination?.limit);
    const cursor =
      typeof pagination?.cursor === "string" && pagination.cursor.trim()
        ? pagination.cursor.trim()
        : undefined;

    const revisions = await this.prisma.pageRevision.findMany({
      where: { pageId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = revisions.length > limit;
    const items = (hasMore ? revisions.slice(0, limit) : revisions).map(
      mapPageRevision,
    );

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async findRevisionById(
    pageId: string,
    revisionId: string,
  ): Promise<PageRevision | null> {
    const revision = await this.prisma.pageRevision.findFirst({
      where: { id: revisionId, pageId },
    });
    return revision ? mapPageRevision(revision) : null;
  }

  async restoreRevision(
    pageId: string,
    revisionId: string,
    restoredById?: string | null,
    revisionNote?: string | null,
  ): Promise<Page> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.page.findUnique({
        where: { id: pageId },
        include: { blocks: { orderBy: { order: "asc" } } },
      });
      if (!current) {
        throw new DomainError("VALIDATION_ERROR", "Page not found.");
      }

      const revision = await tx.pageRevision.findFirst({
        where: { id: revisionId, pageId },
      });
      if (!revision) {
        throw new DomainError("VALIDATION_ERROR", "Page revision not found.");
      }

      await tx.pageRevision.create({
        data: {
          pageId,
          snapshot: current as unknown as InputJsonValue,
          createdById: restoredById ?? null,
          revisionNote: revisionNote ?? null,
        },
      });

      const snapshot = revision.snapshot as Record<string, unknown>;
      const blocksSnapshot = Array.isArray(snapshot.blocks)
        ? snapshot.blocks
        : [];

      const restoredSlug =
        typeof snapshot.slug === "string" ? snapshot.slug : current.slug;
      assertValidRouteSlug(restoredSlug, "Page");

      if (restoredSlug !== current.slug) {
        const activeConflict = await tx.page.findFirst({
          where: { slug: restoredSlug, id: { not: pageId } },
          select: { id: true },
        });
        if (activeConflict) {
          throw new DomainError(
            "VALIDATION_ERROR",
            `Cannot restore revision because slug '${restoredSlug}' is already used by another page.`,
          );
        }

        const redirectConflict = await tx.pageSlugRedirect.findFirst({
          where: { sourceSlug: restoredSlug, pageId: { not: pageId } },
          select: { id: true },
        });
        if (redirectConflict) {
          throw new DomainError(
            "VALIDATION_ERROR",
            `Cannot restore revision because slug '${restoredSlug}' is used as a redirect source.`,
          );
        }

        await tx.pageSlugRedirect.deleteMany({
          where: { pageId, sourceSlug: restoredSlug },
        });

        const existingRedirect = await tx.pageSlugRedirect.findUnique({
          where: { sourceSlug: current.slug },
          select: { id: true },
        });

        if (!existingRedirect) {
          await tx.pageSlugRedirect.create({
            data: { pageId, sourceSlug: current.slug },
          });
        }
      }

      await tx.pageBlock.deleteMany({ where: { pageId } });

      const page = await tx.page.update({
        where: { id: pageId },
        data: {
          slug: restoredSlug,
          title:
            typeof snapshot.title === "string" ? snapshot.title : current.title,
          seoTitle:
            snapshot.seoTitle === null || typeof snapshot.seoTitle === "string"
              ? snapshot.seoTitle
              : current.seoTitle,
          seoDescription:
            snapshot.seoDescription === null ||
            typeof snapshot.seoDescription === "string"
              ? snapshot.seoDescription
              : current.seoDescription,
          seoImage:
            snapshot.seoImage === null || typeof snapshot.seoImage === "string"
              ? snapshot.seoImage
              : current.seoImage,
          canonicalUrl:
            snapshot.canonicalUrl === null ||
            typeof snapshot.canonicalUrl === "string"
              ? snapshot.canonicalUrl
              : current.canonicalUrl,
          noIndex:
            typeof snapshot.noIndex === "boolean"
              ? snapshot.noIndex
              : current.noIndex,
          published:
            typeof snapshot.published === "boolean"
              ? snapshot.published
              : current.published,
          workflowStatus:
            snapshot.workflowStatus === undefined
              ? current.workflowStatus
              : normalizeWorkflowStatus(snapshot.workflowStatus),
          publishAt:
            snapshot.publishAt === null ||
            typeof snapshot.publishAt === "string"
              ? snapshot.publishAt
              : current.publishAt,
          unpublishAt:
            snapshot.unpublishAt === null ||
            typeof snapshot.unpublishAt === "string"
              ? snapshot.unpublishAt
              : current.unpublishAt,
          templateKey:
            snapshot.templateKey === null ||
            typeof snapshot.templateKey === "string"
              ? snapshot.templateKey
              : current.templateKey,
          blocks: {
            create: blocksSnapshot
              .map((block, index) => {
                if (
                  !block ||
                  typeof block !== "object" ||
                  Array.isArray(block)
                ) {
                  return null;
                }
                const b = block as Record<string, unknown>;
                return {
                  type: typeof b.type === "string" ? b.type : "rich_text",
                  data:
                    b.data &&
                    typeof b.data === "object" &&
                    !Array.isArray(b.data)
                      ? (b.data as InputJsonValue)
                      : ({} as InputJsonValue),
                  order: typeof b.order === "number" ? b.order : index,
                };
              })
              .filter(
                (
                  entry,
                ): entry is {
                  type: string;
                  data: InputJsonValue;
                  order: number;
                } => Boolean(entry),
              ),
          },
        },
        include: { blocks: { orderBy: { order: "asc" } } },
      });

      await pruneOlderPageRevisions(tx, pageId);

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
        data: data.data as InputJsonValue,
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
        data:
          data.data === undefined ? undefined : (data.data as InputJsonValue),
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

  async findMany(pagination?: PaginationParams): Promise<ContentType[]> {
    const types = await this.prisma.contentType.findMany({
      orderBy: { createdAt: "desc" },
      ...buildPaginationArgs(pagination),
    });
    return types.map(mapContentType);
  }

  async findManyPublic(pagination?: PaginationParams): Promise<ContentType[]> {
    const types = await this.prisma.contentType.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      ...buildPaginationArgs(pagination),
    });
    return types.map(mapContentType);
  }

  async findById(id: string): Promise<ContentType | null> {
    const type = await this.prisma.contentType.findUnique({ where: { id } });
    return type ? mapContentType(type) : null;
  }

  async findManyBySlugs(slugs: string[]): Promise<ContentType[]> {
    if (slugs.length === 0) {
      return [];
    }

    const types = await this.prisma.contentType.findMany({
      where: { slug: { in: slugs } },
    });
    return types.map(mapContentType);
  }

  async findBySlug(slug: string): Promise<ContentType | null> {
    const type = await this.prisma.contentType.findUnique({ where: { slug } });
    return type ? mapContentType(type) : null;
  }

  async findPublicBySlug(slug: string): Promise<ContentType | null> {
    const type = await this.prisma.contentType.findFirst({
      where: { slug, isPublic: true },
    });
    return type ? mapContentType(type) : null;
  }

  async create(
    data: Omit<ContentType, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentType> {
    assertValidRouteSlug(data.slug, "ContentType");

    const type = await this.prisma.contentType.create({
      data: {
        ...data,
        fields: data.fields as InputJsonValue,
      },
    });
    return mapContentType(type);
  }

  async update(
    id: string,
    data: Partial<Omit<ContentType, "id" | "createdAt" | "updatedAt">>,
  ): Promise<ContentType> {
    const existing = await this.prisma.contentType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new DomainError("VALIDATION_ERROR", "Content type not found.");
    }

    const nextSlug = typeof data.slug === "string" ? data.slug : existing.slug;
    assertValidRouteSlug(nextSlug, "ContentType");

    const type = await this.prisma.contentType.update({
      where: { id },
      data: {
        ...data,
        fields:
          data.fields === undefined
            ? undefined
            : (data.fields as InputJsonValue),
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

  async countByContentTypeId(contentTypeId: string): Promise<number> {
    return this.prisma.contentItem.count({ where: { contentTypeId } });
  }

  async findMany(pagination?: PaginationParams): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...(typeof pagination?.published === "boolean"
        ? { where: { published: pagination.published } }
        : {}),
      ...buildPaginationArgs(pagination),
    });
    return this.resolveReferences(items.map(mapContentItem));
  }

  async findManyByContentTypeId(
    contentTypeId: string,
    pagination?: PaginationParams,
  ): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      where: {
        contentTypeId,
        ...(typeof pagination?.published === "boolean"
          ? { published: pagination.published }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...buildPaginationArgs(pagination),
    });
    return this.resolveReferences(items.map(mapContentItem));
  }

  async findManyByContentTypeSlug(
    contentTypeSlug: string,
    pagination?: PaginationParams,
  ): Promise<ContentItem[]> {
    const items = await this.prisma.contentItem.findMany({
      where: {
        contentType: { slug: contentTypeSlug },
        ...(typeof pagination?.published === "boolean"
          ? { published: pagination.published }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      ...buildPaginationArgs(pagination),
    });
    return this.resolveReferences(items.map(mapContentItem));
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
    if (!item) {
      return null;
    }

    const [resolved] = await this.resolveReferences([mapContentItem(item)]);
    return resolved ?? null;
  }

  async findManyByIds(ids: string[]): Promise<ContentItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const items = await this.prisma.contentItem.findMany({
      where: { id: { in: ids } },
    });

    return this.resolveReferences(items.map(mapContentItem));
  }

  async findBySlug(
    contentTypeSlug: string,
    slug: string,
  ): Promise<ContentItem | null> {
    const item = await this.prisma.contentItem.findFirst({
      where: { slug, contentType: { slug: contentTypeSlug } },
    });
    if (!item) {
      return null;
    }

    const [resolved] = await this.resolveReferences([mapContentItem(item)]);
    return resolved ?? null;
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

  private async resolveReferences(
    items: ContentItem[],
  ): Promise<ContentItem[]> {
    if (items.length === 0) {
      return items;
    }

    const contentTypeIds = [
      ...new Set(items.map((item) => item.contentTypeId)),
    ];
    const contentTypes = await this.prisma.contentType.findMany({
      where: { id: { in: contentTypeIds } },
      select: { id: true, fields: true },
    });

    const fieldsByTypeId = new Map<string, ContentFieldDefinition[]>(
      contentTypes.map((contentType: { id: string; fields: unknown }) => [
        contentType.id,
        mapContentFields(contentType.fields),
      ]),
    );

    const toReferenceIds = (value: unknown, multiple: boolean): string[] => {
      if (multiple) {
        if (!Array.isArray(value)) {
          return [];
        }

        return value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }

      if (typeof value !== "string") {
        return [];
      }

      const normalized = value.trim();
      return normalized ? [normalized] : [];
    };

    const pageIds = new Set<string>();
    const mediaIds = new Set<string>();
    const contentItemIds = new Set<string>();

    for (const item of items) {
      const fields = fieldsByTypeId.get(item.contentTypeId) ?? [];
      for (const field of fields) {
        if (
          field.type !== "relation" &&
          field.type !== "media" &&
          field.type !== "contentItem" &&
          field.type !== "page"
        ) {
          continue;
        }

        const relationTargetType =
          field.type === "media"
            ? "media"
            : field.type === "contentItem"
              ? "contentType"
              : field.type === "page"
                ? "page"
                : field.relation?.targetType;
        const ids = toReferenceIds(
          item.data[field.key],
          Boolean(field.relation?.multiple),
        );

        for (const refId of ids) {
          if (relationTargetType === "page") {
            pageIds.add(refId);
          } else if (relationTargetType === "media") {
            mediaIds.add(refId);
          } else if (relationTargetType === "contentType") {
            contentItemIds.add(refId);
          }
        }
      }
    }

    const pages = pageIds.size
      ? await this.prisma.page.findMany({
          where: { id: { in: [...pageIds] } },
          include: { blocks: { orderBy: { order: "asc" } } },
        })
      : [];

    const media = mediaIds.size
      ? await this.prisma.media.findMany({
          where: { id: { in: [...mediaIds] } },
        })
      : [];

    const contentItems = contentItemIds.size
      ? await this.prisma.contentItem.findMany({
          where: { id: { in: [...contentItemIds] } },
        })
      : [];

    const pageById = new Map<string, Page>(
      pages.map((entry: Parameters<typeof mapPage>[0]) => [
        entry.id,
        mapPage(entry),
      ]),
    );
    const mediaById = new Map<string, Media>(
      media.map((entry: Parameters<typeof mapMedia>[0]) => [
        entry.id,
        mapMedia(entry),
      ]),
    );
    const contentItemById = new Map<string, ContentItem>(
      contentItems.map((entry: Parameters<typeof mapContentItem>[0]) => [
        entry.id,
        mapContentItem(entry),
      ]),
    );

    return items.map((item) => {
      const fields = fieldsByTypeId.get(item.contentTypeId) ?? [];
      const resolvedReferences: NonNullable<ContentItem["resolvedReferences"]> =
        {};

      for (const field of fields) {
        const multiple = Boolean(field.relation?.multiple);
        const ids = toReferenceIds(item.data[field.key], multiple);
        if (ids.length === 0) {
          continue;
        }

        const relationTargetType =
          field.type === "media"
            ? "media"
            : field.type === "contentItem"
              ? "contentType"
              : field.type === "page"
                ? "page"
                : field.relation?.targetType;

        if (relationTargetType === "page") {
          const values = ids.map((refId) => pageById.get(refId) ?? null);
          resolvedReferences[field.key] = {
            targetType: "page",
            ...(multiple ? { multiple: true } : {}),
            value: multiple ? values : (values[0] ?? null),
          };
          continue;
        }

        if (relationTargetType === "media") {
          const values = ids.map((refId) => mediaById.get(refId) ?? null);
          resolvedReferences[field.key] = {
            targetType: "media",
            ...(multiple ? { multiple: true } : {}),
            value: multiple ? values : (values[0] ?? null),
          };
          continue;
        }

        if (relationTargetType === "contentType") {
          const values = ids.map((refId) => contentItemById.get(refId) ?? null);
          resolvedReferences[field.key] = {
            targetType: "contentItem",
            ...(multiple ? { multiple: true } : {}),
            value: multiple ? values : (values[0] ?? null),
          };
        }
      }

      return {
        ...item,
        resolvedReferences,
      };
    });
  }

  async create(
    data: Omit<ContentItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<ContentItem> {
    assertValidRouteSlug(data.slug, "ContentItem");

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
        data: data.data as InputJsonValue,
      },
    });
    return mapContentItem(item);
  }

  async update(
    id: string,
    data: Partial<Omit<ContentItem, "id" | "createdAt" | "updatedAt">> & {
      updatedById?: string | null;
      revisionNote?: string | null;
    },
  ): Promise<ContentItem> {
    const { updatedById, revisionNote, ...itemData } = data;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.contentItem.findUnique({ where: { id } });
      if (!existing) {
        throw new DomainError("VALIDATION_ERROR", "Content item not found.");
      }

      await tx.contentItemRevision.create({
        data: {
          contentItemId: existing.id,
          snapshot: existing as unknown as InputJsonValue,
          createdById: updatedById ?? null,
          revisionNote: revisionNote ?? null,
        },
      });

      await pruneOlderContentItemRevisions(tx, existing.id);

      const nextSlug =
        typeof itemData.slug === "string" ? itemData.slug : existing.slug;
      const nextContentTypeId =
        itemData.contentTypeId ?? existing.contentTypeId;

      assertValidRouteSlug(nextSlug, "ContentItem");

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
          ...itemData,
          workflowStatus:
            itemData.workflowStatus === undefined
              ? undefined
              : itemData.workflowStatus,
          parentId:
            itemData.parentId === undefined ? undefined : itemData.parentId,
          sortOrder: itemData.sortOrder,
          data:
            itemData.data === undefined
              ? undefined
              : (itemData.data as InputJsonValue),
        },
      });
      return mapContentItem(item);
    });
  }

  async listRevisions(
    contentItemId: string,
    pagination?: PaginationParams,
  ): Promise<{ items: ContentItemRevision[]; nextCursor: string | null }> {
    const limit = normalizePaginationLimit(pagination?.limit);
    const cursor =
      typeof pagination?.cursor === "string" && pagination.cursor.trim()
        ? pagination.cursor.trim()
        : undefined;

    const revisions = await this.prisma.contentItemRevision.findMany({
      where: { contentItemId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = revisions.length > limit;
    const items = (hasMore ? revisions.slice(0, limit) : revisions).map(
      mapContentItemRevision,
    );

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  async findRevisionById(
    contentItemId: string,
    revisionId: string,
  ): Promise<ContentItemRevision | null> {
    const revision = await this.prisma.contentItemRevision.findFirst({
      where: { id: revisionId, contentItemId },
    });
    return revision ? mapContentItemRevision(revision) : null;
  }

  async restoreRevision(
    contentItemId: string,
    revisionId: string,
    restoredById?: string | null,
    revisionNote?: string | null,
  ): Promise<ContentItem> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.contentItem.findUnique({
        where: { id: contentItemId },
      });
      if (!current) {
        throw new DomainError("VALIDATION_ERROR", "Content item not found.");
      }

      const revision = await tx.contentItemRevision.findFirst({
        where: { id: revisionId, contentItemId },
      });
      if (!revision) {
        throw new DomainError(
          "VALIDATION_ERROR",
          "Content item revision not found.",
        );
      }

      await tx.contentItemRevision.create({
        data: {
          contentItemId,
          snapshot: current as unknown as InputJsonValue,
          createdById: restoredById ?? null,
          revisionNote: revisionNote ?? null,
        },
      });

      const snapshot = revision.snapshot as Record<string, unknown>;
      const restoredContentTypeId =
        typeof snapshot.contentTypeId === "string"
          ? snapshot.contentTypeId
          : current.contentTypeId;
      const restoredSlug =
        typeof snapshot.slug === "string" ? snapshot.slug : current.slug;

      assertValidRouteSlug(restoredSlug, "Content item");

      const activeConflict = await tx.contentItem.findFirst({
        where: {
          id: { not: contentItemId },
          contentTypeId: restoredContentTypeId,
          slug: restoredSlug,
        },
        select: { id: true },
      });
      if (activeConflict) {
        throw new DomainError(
          "VALIDATION_ERROR",
          `Cannot restore revision because slug '${restoredSlug}' is already used by another content item.`,
        );
      }

      const redirectConflict = await tx.contentItemSlugRedirect.findFirst({
        where: {
          contentTypeId: restoredContentTypeId,
          sourceSlug: restoredSlug,
          contentItemId: { not: contentItemId },
        },
        select: { id: true },
      });
      if (redirectConflict) {
        throw new DomainError(
          "VALIDATION_ERROR",
          `Cannot restore revision because slug '${restoredSlug}' is used as a redirect source.`,
        );
      }

      if (
        restoredSlug !== current.slug ||
        restoredContentTypeId !== current.contentTypeId
      ) {
        await tx.contentItemSlugRedirect.deleteMany({
          where: {
            contentItemId,
            contentTypeId: restoredContentTypeId,
            sourceSlug: restoredSlug,
          },
        });

        const existingRedirect = await tx.contentItemSlugRedirect.findFirst({
          where: {
            contentTypeId: current.contentTypeId,
            sourceSlug: current.slug,
          },
          select: { id: true },
        });

        if (!existingRedirect) {
          await tx.contentItemSlugRedirect.create({
            data: {
              contentItemId,
              contentTypeId: current.contentTypeId,
              sourceSlug: current.slug,
            },
          });
        }
      }

      const item = await tx.contentItem.update({
        where: { id: contentItemId },
        data: {
          contentTypeId: restoredContentTypeId,
          parentId:
            snapshot.parentId === null || typeof snapshot.parentId === "string"
              ? snapshot.parentId
              : current.parentId,
          sortOrder:
            typeof snapshot.sortOrder === "number"
              ? snapshot.sortOrder
              : current.sortOrder,
          slug: restoredSlug,
          title:
            typeof snapshot.title === "string" ? snapshot.title : current.title,
          seoTitle:
            snapshot.seoTitle === null || typeof snapshot.seoTitle === "string"
              ? snapshot.seoTitle
              : current.seoTitle,
          seoDescription:
            snapshot.seoDescription === null ||
            typeof snapshot.seoDescription === "string"
              ? snapshot.seoDescription
              : current.seoDescription,
          seoImage:
            snapshot.seoImage === null || typeof snapshot.seoImage === "string"
              ? snapshot.seoImage
              : current.seoImage,
          canonicalUrl:
            snapshot.canonicalUrl === null ||
            typeof snapshot.canonicalUrl === "string"
              ? snapshot.canonicalUrl
              : current.canonicalUrl,
          noIndex:
            typeof snapshot.noIndex === "boolean"
              ? snapshot.noIndex
              : current.noIndex,
          data:
            snapshot.data &&
            typeof snapshot.data === "object" &&
            !Array.isArray(snapshot.data)
              ? (snapshot.data as InputJsonValue)
              : (current.data as unknown as InputJsonValue),
          published:
            typeof snapshot.published === "boolean"
              ? snapshot.published
              : current.published,
          workflowStatus:
            snapshot.workflowStatus === undefined
              ? current.workflowStatus
              : normalizeWorkflowStatus(snapshot.workflowStatus),
          publishAt:
            snapshot.publishAt === null ||
            typeof snapshot.publishAt === "string"
              ? snapshot.publishAt
              : current.publishAt,
          unpublishAt:
            snapshot.unpublishAt === null ||
            typeof snapshot.unpublishAt === "string"
              ? snapshot.unpublishAt
              : current.unpublishAt,
        },
      });

      await pruneOlderContentItemRevisions(tx, contentItemId);

      return mapContentItem(item);
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contentItem.delete({ where: { id } });
  }
}

export class TaxonomiesPrismaRepository implements TaxonomiesRepository {
  private readonly prisma = getPrisma();

  async findMany(pagination?: PaginationParams): Promise<Taxonomy[]> {
    const taxonomies = await this.prisma.taxonomy.findMany({
      orderBy: { createdAt: "desc" },
      ...buildPaginationArgs(pagination),
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

  async findMany(pagination?: PaginationParams): Promise<Term[]> {
    const terms = await this.prisma.term.findMany({
      orderBy: { createdAt: "desc" },
      ...buildPaginationArgs(pagination),
    });
    return terms.map(mapTerm);
  }

  async findManyByTaxonomyId(
    taxonomyId: string,
    pagination?: PaginationParams,
  ): Promise<Term[]> {
    const terms = await this.prisma.term.findMany({
      where: { taxonomyId },
      orderBy: [{ createdAt: "desc" }],
      ...buildPaginationArgs(pagination),
    });
    return terms.map(mapTerm);
  }

  async findManyByIds(ids: string[]): Promise<Term[]> {
    if (ids.length === 0) {
      return [];
    }

    const terms = await this.prisma.term.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "desc" },
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
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

  async findMany(pagination?: PaginationParams): Promise<NavigationItem[]> {
    return this.prisma.navigationItem.findMany({
      orderBy: { order: "asc" },
      ...buildPaginationArgs(pagination),
    });
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


function mapRedirect(redirect: {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: Date;
  updatedAt: Date;
}): Redirect {
  return {
    ...redirect,
    statusCode: redirect.statusCode === 302 ? 302 : 301,
  };
}

function mapSiteEnvironmentStatus(status: {
  environment: string;
  state: string;
  lastSyncedAt: Date | null;
  lastPushedAt: Date | null;
  lastResetAt: Date | null;
  lockStatus: string;
  lastActorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SiteEnvironmentStatus {
  return {
    environment: status.environment as SiteEnvironmentName,
    state: status.state as SiteEnvironmentState,
    lastSyncedAt: status.lastSyncedAt,
    lastPushedAt: status.lastPushedAt,
    lastResetAt: status.lastResetAt,
    lockStatus: status.lockStatus as SiteEnvironmentLockStatus,
    lastActorUserId: status.lastActorUserId,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
  };
}

export class RedirectsPrismaRepository implements RedirectsRepository {
  private readonly prisma = getPrisma();

  async findMany(pagination?: PaginationParams): Promise<Redirect[]> {
    const redirects = await this.prisma.redirectRule.findMany({
      orderBy: { fromPath: "asc" },
      ...buildPaginationArgs(pagination),
    });

    return redirects.map(mapRedirect);
  }

  async findById(id: string): Promise<Redirect | null> {
    const redirect = await this.prisma.redirectRule.findUnique({ where: { id } });
    return redirect ? mapRedirect(redirect) : null;
  }

  async create(
    data: Omit<Redirect, "id" | "createdAt" | "updatedAt">,
  ): Promise<Redirect> {
    const redirect = await this.prisma.redirectRule.create({ data });
    return mapRedirect(redirect);
  }

  async update(
    id: string,
    data: Partial<Omit<Redirect, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Redirect> {
    const redirect = await this.prisma.redirectRule.update({ where: { id }, data });
    return mapRedirect(redirect);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.redirectRule.delete({ where: { id } });
  }
}

export class SiteSettingsPrismaRepository implements SiteSettingsRepository {
  private readonly prisma = getPrisma();

  async findMany(pagination?: PaginationParams): Promise<SiteSetting[]> {
    return this.prisma.siteSetting.findMany({
      orderBy: { key: "asc" },
      ...buildPaginationArgs(pagination, "key"),
    });
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



export class SiteEnvironmentStatusPrismaRepository
  implements SiteEnvironmentStatusRepository
{
  private readonly prisma = getPrisma();

  async get(
    environment: SiteEnvironmentName,
  ): Promise<SiteEnvironmentStatus | null> {
    const status = await this.prisma.siteEnvironmentStatus.findUnique({
      where: { environment },
    });
    return status ? mapSiteEnvironmentStatus(status) : null;
  }

  async list(): Promise<SiteEnvironmentStatus[]> {
    const statuses = await this.prisma.siteEnvironmentStatus.findMany({
      orderBy: { environment: "asc" },
    });

    return statuses.map(mapSiteEnvironmentStatus);
  }

  async upsert(
    status: Omit<SiteEnvironmentStatus, "createdAt" | "updatedAt">,
  ): Promise<SiteEnvironmentStatus> {
    const record = await this.prisma.siteEnvironmentStatus.upsert({
      where: { environment: status.environment },
      create: status,
      update: {
        state: status.state,
        lastSyncedAt: status.lastSyncedAt,
        lastPushedAt: status.lastPushedAt,
        lastResetAt: status.lastResetAt,
        lockStatus: status.lockStatus,
        lastActorUserId: status.lastActorUserId,
      },
    });

    return mapSiteEnvironmentStatus(record);
  }

  async update(
    environment: SiteEnvironmentName,
    data: UpdateSiteEnvironmentStatusInput,
  ): Promise<SiteEnvironmentStatus> {
    const record = await this.prisma.siteEnvironmentStatus.update({
      where: { environment },
      data,
    });

    return mapSiteEnvironmentStatus(record);
  }

  async delete(environment: SiteEnvironmentName): Promise<void> {
    await this.prisma.siteEnvironmentStatus.delete({
      where: { environment },
    });
  }
}

export class MediaPrismaRepository implements MediaRepository {
  private readonly prisma = getPrisma();

  async findMany(pagination?: PaginationParams): Promise<Media[]> {
    const media = await this.prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      ...buildPaginationArgs(pagination),
    });
    return media.map(mapMedia);
  }

  async findById(id: string): Promise<Media | null> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    return media ? mapMedia(media) : null;
  }

  async findManyByIds(ids: string[]): Promise<Media[]> {
    if (ids.length === 0) {
      return [];
    }

    const media = await this.prisma.media.findMany({
      where: { id: { in: ids } },
    });

    return media.map(mapMedia);
  }

  async findManyByUrls(urls: string[]): Promise<Media[]> {
    if (urls.length === 0) {
      return [];
    }

    const media = await this.prisma.media.findMany({
      where: { url: { in: urls } },
    });

    return media.map(mapMedia);
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
