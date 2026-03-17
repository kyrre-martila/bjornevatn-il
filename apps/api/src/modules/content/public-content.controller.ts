import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type {
  ContentItem,
  ContentItemTreeNode,
  ContentItemsRepository,
  ContentTypesRepository,
  NavigationItemsRepository,
  Page,
  PagesRepository,
  SiteSettingsRepository,
  TaxonomiesRepository,
  TermsRepository,
  ContentItemTermsRepository,
} from "@org/domain";

const PUBLIC_SITE_SETTING_KEYS = [
  "siteName",
  "siteUrl",
  "defaultSeoImage",
  "defaultTitleSuffix",
  "site_title",
  "site_tagline",
  "logo_url",
  "footer_text",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "site_url",
  "robots_noindex",
  "robots_disallow_all",
] as const;

const LIST_MODES = ["flat", "tree"] as const;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const SITEMAP_BATCH_SIZE = 200;

class PublicListContentItemsQueryDto {
  @ApiProperty({ required: false, enum: LIST_MODES, default: "flat" })
  @IsOptional()
  @IsString()
  @IsIn(LIST_MODES)
  mode?: (typeof LIST_MODES)[number];

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: MAX_LIST_LIMIT,
    default: DEFAULT_LIST_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
}

type PublicContentItemArchiveDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  shortDescription: string;
  featuredImage: string | null;
  publishedAt: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
  data: Record<string, unknown>;
  parentId?: string;
};

type PublicContentItemDetailDto = PublicContentItemArchiveDto & {
  body: string;
  callToActionLabel: string;
  callToActionUrl: string;
  relatedItemIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
};

type PublicContentItemTreeDto = PublicContentItemArchiveDto & {
  children: PublicContentItemTreeDto[];
};

type PublicContentTypeDto = {
  slug: string;
  name: string;
  templateKey: string | null;
  isPublic: boolean;
};

type PublicPageBlockType = "hero" | "rich_text" | "cta" | "image" | "news_list";

type PublicPageBlockData =
  | {
      type: "hero";
      data: {
        eyebrow: string;
        title: string;
        subtitle: string;
        primaryCta: { href: string; label: string };
        secondaryCta: { href: string; label: string };
      };
    }
  | { type: "rich_text"; data: { paragraphs: string[] } }
  | {
      type: "cta";
      data: {
        href: string;
        label: string;
        title?: string;
        description?: string;
      };
    }
  | {
      type: "image";
      data: {
        src: string;
        alt?: string;
        caption?: string;
        width?: number;
        height?: number;
      };
    }
  | { type: "news_list"; data: { title?: string; count?: number } };

type PublicPageBlockDto = {
  id: string;
  type: PublicPageBlockType;
  order: number;
  data: PublicPageBlockData["data"];
};

type PublicPageDto = {
  slug: string;
  title: string;
  templateKey: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  blocks: PublicPageBlockDto[];
};

type PublicSitemapEntryDto = {
  pages: Array<{
    slug: string;
    canonicalUrl: string | null;
    updatedAt: Date;
    noIndex: boolean;
  }>;
  contentItems: Array<{
    contentTypeSlug: string;
    slug: string;
    canonicalUrl: string | null;
    updatedAt: Date;
    noIndex: boolean;
  }>;
};

class PublicSiteSettingDto {
  key!: string;
  value!: string;
}

class PublicPageListItemDto {
  slug!: string;
  canonicalUrl!: string | null;
  updatedAt!: Date;
  noIndex!: boolean;
}

class PublicListPagesQueryDto {
  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: MAX_LIST_LIMIT,
    default: DEFAULT_LIST_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
}

class PublicNavigationItemDto {
  id!: string;
  label!: string;
  url!: string;
  order!: number;
  parentId!: string | null;
}

@ApiTags("public-content")
@Controller("public/content")
export class PublicContentController {
  constructor(
    @Inject("PagesRepository")
    private readonly pages: PagesRepository,
    @Inject("ContentTypesRepository")
    private readonly contentTypes: ContentTypesRepository,
    @Inject("ContentItemsRepository")
    private readonly contentItems: ContentItemsRepository,
    @Inject("NavigationItemsRepository")
    private readonly navigation: NavigationItemsRepository,
    @Inject("SiteSettingsRepository")
    private readonly settings: SiteSettingsRepository,
    @Inject("TaxonomiesRepository")
    private readonly taxonomies: TaxonomiesRepository,
    @Inject("TermsRepository")
    private readonly terms: TermsRepository,
    @Inject("ContentItemTermsRepository")
    private readonly contentItemTerms: ContentItemTermsRepository,
  ) {}

  @Get("sitemap")
  async getSitemapEntries(): Promise<PublicSitemapEntryDto> {
    const types = await this.contentTypes.findManyPublic({
      limit: MAX_LIST_LIMIT,
    });

    const publicContentTypeById = new Map(
      types.map((type) => [type.id, type.slug]),
    );

    const pages: PublicSitemapEntryDto["pages"] = [];
    let pageCursor: string | undefined;

    while (true) {
      const pageBatch = await this.pages.findMany({
        published: true,
        limit: SITEMAP_BATCH_SIZE,
        cursor: pageCursor,
      });

      if (pageBatch.length === 0) {
        break;
      }

      pages.push(
        ...pageBatch
          .filter((page) => this.isCurrentlyPublished(page))
          .map((page) => ({
          slug: page.slug,
          canonicalUrl: page.canonicalUrl,
          updatedAt: page.updatedAt,
          noIndex: page.noIndex,
        })),
      );

      pageCursor = pageBatch[pageBatch.length - 1]?.id;
      if (pageBatch.length < SITEMAP_BATCH_SIZE || !pageCursor) {
        break;
      }
    }

    const contentItems: PublicSitemapEntryDto["contentItems"] = [];
    let contentCursor: string | undefined;

    while (true) {
      const contentBatch = await this.contentItems.findMany({
        published: true,
        limit: SITEMAP_BATCH_SIZE,
        cursor: contentCursor,
      });

      if (contentBatch.length === 0) {
        break;
      }

      for (const item of contentBatch.filter((entry) => this.isCurrentlyPublished(entry))) {
        const contentTypeSlug = publicContentTypeById.get(item.contentTypeId);
        if (!contentTypeSlug) {
          continue;
        }

        contentItems.push({
          contentTypeSlug,
          slug: item.slug,
          canonicalUrl: item.canonicalUrl,
          updatedAt: item.updatedAt,
          noIndex: item.noIndex,
        });
      }

      contentCursor = contentBatch[contentBatch.length - 1]?.id;
      if (contentBatch.length < SITEMAP_BATCH_SIZE || !contentCursor) {
        break;
      }
    }

    return { pages, contentItems };
  }

  @Get("pages")
  async listPages(
    @Query() query: PublicListPagesQueryDto,
  ): Promise<PublicPageListItemDto[]> {
    const pages = await this.pages.findMany({
      published: true,
      ...this.buildPagination(query),
    });

    return pages.filter((page) => this.isCurrentlyPublished(page)).map((page) => ({
      slug: page.slug,
      canonicalUrl: page.canonicalUrl,
      updatedAt: page.updatedAt,
      noIndex: page.noIndex,
    }));
  }

  @Get("pages/slug/:slug")
  async getPageBySlug(@Param("slug") slug: string) {
    const result = await this.pages.findBySlugOrRedirect(slug);
    if (!result) {
      return null;
    }

    if (result.kind === "redirect") {
      return { redirectTo: `/page/${result.destinationSlug}`, permanent: true };
    }

    if (!this.isCurrentlyPublished(result.entity)) {
      return null;
    }

    return this.mapPublicPage(result.entity);
  }

  @Get("types")
  async listContentTypes(): Promise<PublicContentTypeDto[]> {
    const types = await this.contentTypes.findManyPublic();
    return types.map((type) => this.mapPublicContentType(type));
  }

  @Get("types/:slug")
  async getContentTypeBySlug(
    @Param("slug") slug: string,
  ): Promise<PublicContentTypeDto | null> {
    const type = await this.contentTypes.findPublicBySlug(slug);
    return type ? this.mapPublicContentType(type) : null;
  }

  @Get("items/type-slug/:slug")
  async listContentItemsByTypeSlug(
    @Param("slug") slug: string,
    @Query() query: PublicListContentItemsQueryDto,
  ) {
    const type = await this.contentTypes.findPublicBySlug(slug);
    if (!type) {
      return [];
    }

    if (query.mode === "tree") {
      const items = await this.contentItems.findTreeByContentTypeSlug(slug);
      return this.filterPublishedContentItemTree(items).map((item) =>
        this.mapPublicContentItemTree(item),
      );
    }

    const items = await this.contentItems.findManyByContentTypeSlug(slug, {
      published: true,
      ...this.buildPagination(query),
    });
    return items
      .filter((item) => this.isCurrentlyPublished(item))
      .map((item) => this.mapPublicContentItemArchive(item));
  }

  @Get("items/type-slug/:contentTypeSlug/:slug")
  async getContentItemBySlug(
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("slug") slug: string,
  ): Promise<
    PublicContentItemDetailDto | { redirectTo: string; permanent: true } | null
  > {
    const type = await this.contentTypes.findPublicBySlug(contentTypeSlug);
    if (!type) {
      return null;
    }

    const result = await this.contentItems.findBySlugOrRedirect(
      contentTypeSlug,
      slug,
    );
    if (!result) {
      return null;
    }

    if (result.kind === "redirect") {
      return {
        redirectTo: `/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(result.destinationSlug)}`,
        permanent: true,
      };
    }

    if (!this.isCurrentlyPublished(result.entity)) {
      return null;
    }

    return this.mapPublicContentItemDetail(result.entity);
  }

  @Get("items/:id/taxonomies/:taxonomySlug")
  async listTaxonomyTermsForItem(
    @Param("id") id: string,
    @Param("taxonomySlug") taxonomySlug: string,
  ): Promise<string[]> {
    const isPublicItem = await this.isPublishedPublicContentItem(id);
    if (!isPublicItem) {
      return [];
    }

    return this.findTaxonomyTermNamesByItemIdAndTaxonomySlug(id, taxonomySlug);
  }

  @Get("items/type-slug/:contentTypeSlug/:id/taxonomies/:taxonomySlug")
  async listTaxonomyTermsForItemByTypeSlug(
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("id") id: string,
    @Param("taxonomySlug") taxonomySlug: string,
  ): Promise<string[]> {
    const isPublicItem = await this.isPublishedPublicContentItem(
      id,
      contentTypeSlug,
    );
    if (!isPublicItem) {
      return [];
    }

    return this.findTaxonomyTermNamesByItemIdAndTaxonomySlug(id, taxonomySlug);
  }

  @Get("items/:id/taxonomies")
  async listTaxonomyRelationsForItem(
    @Param("id") id: string,
  ): Promise<
    Array<{ taxonomySlug: string; taxonomyName: string; termNames: string[] }>
  > {
    const isPublicItem = await this.isPublishedPublicContentItem(id);
    if (!isPublicItem) {
      return [];
    }

    const [links, taxonomies] = await Promise.all([
      this.contentItemTerms.findManyByContentItemId(id),
      this.listAllTaxonomies(),
    ]);

    if (!links.length || !taxonomies.length) {
      return [];
    }

    const terms = await this.terms.findManyByIds(
      links.map((link) => link.termId),
    );
    const termNamesByTaxonomyId = new Map<string, string[]>();

    for (const term of terms) {
      const names = termNamesByTaxonomyId.get(term.taxonomyId) ?? [];
      names.push(term.name);
      termNamesByTaxonomyId.set(term.taxonomyId, names);
    }

    return taxonomies
      .map((taxonomy) => {
        const termNames = termNamesByTaxonomyId.get(taxonomy.id) ?? [];

        if (!termNames.length) {
          return null;
        }

        return {
          taxonomySlug: taxonomy.slug,
          taxonomyName: taxonomy.name,
          termNames,
        };
      })
      .filter(
        (
          relation,
        ): relation is {
          taxonomySlug: string;
          taxonomyName: string;
          termNames: string[];
        } => Boolean(relation),
      );
  }
  @Get("navigation-items")
  async listNavigationItems(
    @Query() query: PublicListPagesQueryDto,
  ): Promise<PublicNavigationItemDto[]> {
    const items = await this.navigation.findMany(this.buildPagination(query));
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      order: item.order,
      parentId: item.parentId,
    }));
  }

  @Get("settings")
  async listSettings(
    @Query() query: PublicListPagesQueryDto,
  ): Promise<PublicSiteSettingDto[]> {
    const settings = await this.settings.findMany(this.buildPagination(query));
    const allowed = new Set<string>(PUBLIC_SITE_SETTING_KEYS);
    return settings
      .filter((setting) => allowed.has(setting.key))
      .map((setting) => ({ key: setting.key, value: setting.value }));
  }

  private buildPagination(query: {
    offset?: number;
    limit?: number;
    cursor?: string;
  }) {
    const limit =
      typeof query.limit === "number"
        ? Math.min(MAX_LIST_LIMIT, Math.max(1, query.limit))
        : DEFAULT_LIST_LIMIT;

    return {
      offset: query.offset,
      cursor: query.cursor,
      limit,
    };
  }

  private async listAllTaxonomies() {
    const taxonomies = [] as Awaited<
      ReturnType<TaxonomiesRepository["findMany"]>
    >;
    let cursor: string | undefined;

    while (true) {
      const batch = await this.taxonomies.findMany({
        limit: MAX_LIST_LIMIT,
        cursor,
      });

      if (batch.length === 0) {
        break;
      }

      taxonomies.push(...batch);
      cursor = batch[batch.length - 1]?.id;
      if (batch.length < MAX_LIST_LIMIT || !cursor) {
        break;
      }
    }

    return taxonomies;
  }

  private mapPublicContentType(type: {
    slug: string;
    name: string;
    templateKey: string | null;
    isPublic: boolean;
  }): PublicContentTypeDto {
    return {
      slug: type.slug,
      name: type.name,
      templateKey: type.templateKey,
      isPublic: type.isPublic,
    };
  }

  private async isPublishedPublicContentItem(
    contentItemId: string,
    contentTypeSlug?: string,
  ): Promise<boolean> {
    const item = await this.contentItems.findById(contentItemId);
    if (!item || !this.isCurrentlyPublished(item)) {
      return false;
    }

    const contentType = contentTypeSlug
      ? await this.contentTypes.findPublicBySlug(contentTypeSlug)
      : await this.contentTypes.findById(item.contentTypeId);

    if (!contentType || !contentType.isPublic) {
      return false;
    }

    if (contentTypeSlug && contentType.id !== item.contentTypeId) {
      return false;
    }

    return true;
  }

  private async findTaxonomyTermNamesByItemIdAndTaxonomySlug(
    contentItemId: string,
    taxonomySlug: string,
  ): Promise<string[]> {
    const taxonomy = (await this.listAllTaxonomies()).find(
      (entry) => entry.slug === taxonomySlug,
    );

    if (!taxonomy) {
      return [];
    }

    const links =
      await this.contentItemTerms.findManyByContentItemId(contentItemId);
    if (!links.length) {
      return [];
    }

    const terms = await this.terms.findManyByIds(
      links.map((link) => link.termId),
    );

    return terms
      .filter((term) => term.taxonomyId === taxonomy.id)
      .map((term) => term.name);
  }

  private mapPublicPage(page: Page): PublicPageDto {
    return {
      slug: page.slug,
      title: page.title,
      templateKey:
        typeof page.templateKey === "string" && page.templateKey.trim()
          ? page.templateKey
          : "index",
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoImage: page.seoImage,
      canonicalUrl: page.canonicalUrl,
      noIndex: page.noIndex,
      blocks: page.blocks
        .map((block) => this.mapPublicPageBlock(block))
        .filter((block): block is PublicPageBlockDto => block !== null),
    };
  }

  private mapPublicPageBlock(block: {
    id: string;
    type: string;
    order: number;
    data: Record<string, unknown>;
  }): PublicPageBlockDto | null {
    const data = this.asRecord(block.data);

    if (block.type === "hero") {
      const primaryCta = this.asRecord(data.primaryCta);
      const secondaryCta = this.asRecord(data.secondaryCta);

      if (
        typeof data.eyebrow !== "string" ||
        typeof data.title !== "string" ||
        typeof data.subtitle !== "string" ||
        typeof primaryCta.href !== "string" ||
        typeof primaryCta.label !== "string" ||
        typeof secondaryCta.href !== "string" ||
        typeof secondaryCta.label !== "string"
      ) {
        return null;
      }

      return {
        id: block.id,
        type: "hero",
        order: block.order,
        data: {
          eyebrow: data.eyebrow,
          title: data.title,
          subtitle: data.subtitle,
          primaryCta: { href: primaryCta.href, label: primaryCta.label },
          secondaryCta: { href: secondaryCta.href, label: secondaryCta.label },
        },
      };
    }

    if (block.type === "rich_text") {
      const paragraphs = Array.isArray(data.paragraphs)
        ? data.paragraphs.filter(
            (paragraph): paragraph is string => typeof paragraph === "string",
          )
        : null;

      if (!paragraphs) {
        return null;
      }

      return {
        id: block.id,
        type: "rich_text",
        order: block.order,
        data: { paragraphs },
      };
    }

    if (block.type === "cta") {
      if (typeof data.href !== "string" || typeof data.label !== "string") {
        return null;
      }

      return {
        id: block.id,
        type: "cta",
        order: block.order,
        data: {
          href: data.href,
          label: data.label,
          ...(typeof data.title === "string" ? { title: data.title } : {}),
          ...(typeof data.description === "string"
            ? { description: data.description }
            : {}),
        },
      };
    }

    if (block.type === "image") {
      if (typeof data.src !== "string") {
        return null;
      }

      return {
        id: block.id,
        type: "image",
        order: block.order,
        data: {
          src: data.src,
          ...(typeof data.alt === "string" ? { alt: data.alt } : {}),
          ...(typeof data.caption === "string"
            ? { caption: data.caption }
            : {}),
          ...(typeof data.width === "number" ? { width: data.width } : {}),
          ...(typeof data.height === "number" ? { height: data.height } : {}),
        },
      };
    }

    if (block.type === "news_list") {
      if (
        data.title !== undefined &&
        data.title !== null &&
        typeof data.title !== "string"
      ) {
        return null;
      }

      if (
        data.count !== undefined &&
        data.count !== null &&
        typeof data.count !== "number"
      ) {
        return null;
      }

      return {
        id: block.id,
        type: "news_list",
        order: block.order,
        data: {
          ...(typeof data.title === "string" ? { title: data.title } : {}),
          ...(typeof data.count === "number" ? { count: data.count } : {}),
        },
      };
    }

    return null;
  }

  private mapPublicContentItemArchive(
    item: ContentItem,
  ): PublicContentItemArchiveDto {
    const data = this.asRecord(item.data);
    const publishedAt =
      typeof data.publishedAt === "string"
        ? data.publishedAt
        : item.updatedAt.toISOString();

    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      summary:
        typeof data.excerpt === "string"
          ? data.excerpt
          : typeof data.summary === "string"
            ? data.summary
            : typeof data.shortDescription === "string"
              ? data.shortDescription
              : "",
      shortDescription:
        typeof data.shortDescription === "string" ? data.shortDescription : "",
      featuredImage:
        typeof data.featuredImage === "string" ? data.featuredImage : null,
      publishedAt,
      canonicalUrl: item.canonicalUrl,
      noIndex: item.noIndex,
      updatedAt: item.updatedAt,
      data,
      ...(item.parentId ? { parentId: item.parentId } : {}),
    };
  }

  private mapPublicContentItemDetail(
    item: ContentItem,
  ): PublicContentItemDetailDto {
    const archive = this.mapPublicContentItemArchive(item);
    const data = this.asRecord(item.data);

    return {
      ...archive,
      body: typeof data.body === "string" ? data.body : "",
      callToActionLabel:
        typeof data.callToActionLabel === "string"
          ? data.callToActionLabel
          : "",
      callToActionUrl:
        typeof data.callToActionUrl === "string" ? data.callToActionUrl : "",
      relatedItemIds: Array.isArray(data.relatedServices)
        ? data.relatedServices.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [],
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      seoImage: item.seoImage,
    };
  }

  private mapPublicContentItemTree(
    item: ContentItemTreeNode,
  ): PublicContentItemTreeDto {
    return {
      ...this.mapPublicContentItemArchive(item),
      children: item.children.map((child) =>
        this.mapPublicContentItemTree(child),
      ),
    };
  }

  private filterPublishedContentItemTree(
    nodes: ContentItemTreeNode[],
  ): ContentItemTreeNode[] {
    return nodes
      .filter((node) => this.isCurrentlyPublished(node))
      .map((node) => ({
        ...node,
        children: this.filterPublishedContentItemTree(node.children),
      }));
  }


  private isCurrentlyPublished(entity: {
    published: boolean;
    publishAt: Date | null;
    unpublishAt: Date | null;
  }): boolean {
    if (!entity.published) {
      return false;
    }

    const now = Date.now();
    if (entity.publishAt && now < entity.publishAt.getTime()) {
      return false;
    }

    if (entity.unpublishAt && now >= entity.unpublishAt.getTime()) {
      return false;
    }

    return true;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
