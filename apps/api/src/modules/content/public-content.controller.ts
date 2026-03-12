import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
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

class PublicListContentItemsQueryDto {
  @ApiProperty({ required: false, enum: LIST_MODES, default: "flat" })
  @IsOptional()
  @IsString()
  @IsIn(LIST_MODES)
  mode?: (typeof LIST_MODES)[number];
}

type PublicContentItemDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  shortDescription: string;
  featuredImage: string | null;
  callToActionLabel: string;
  callToActionUrl: string;
  relatedItemIds: string[];
  publishedAt: string;
  canonicalUrl: string | null;
  noIndex: boolean;
  updatedAt: Date;
  parentId?: string;
};

type PublicContentItemTreeDto = PublicContentItemDto & {
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

  @Get("pages")
  async listPages(): Promise<PublicPageListItemDto[]> {
    const pages = await this.pages.findMany();
    return pages
      .filter((page) => page.published)
      .map((page) => ({
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

    if (!result.entity.published) {
      return null;
    }

    return this.mapPublicPage(result.entity);
  }

  @Get("types")
  async listContentTypes(): Promise<PublicContentTypeDto[]> {
    const types = await this.contentTypes.findManyPublic();
    return types.map((type) => this.mapPublicContentType(type));
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

    const items = await this.contentItems.findManyByContentTypeSlug(slug);
    return items
      .filter((item) => item.published)
      .map((item) => this.mapPublicContentItem(item));
  }

  @Get("items/type-slug/:contentTypeSlug/:slug")
  async getContentItemBySlug(
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("slug") slug: string,
  ) {
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

    if (!result.entity.published) {
      return null;
    }

    return this.mapPublicContentItem(result.entity);
  }


  @Get("items/:id/service-categories")
  async listServiceCategoriesForItem(
    @Param("id") id: string,
  ): Promise<string[]> {
    const serviceTaxonomy = (await this.taxonomies.findMany()).find(
      (taxonomy) => taxonomy.slug === "service-category",
    );

    if (!serviceTaxonomy) {
      return [];
    }

    const [links, terms] = await Promise.all([
      this.contentItemTerms.findManyByContentItemId(id),
      this.terms.findManyByTaxonomyId(serviceTaxonomy.id),
    ]);

    const allowedTermIds = new Set(terms.map((term) => term.id));
    const termNameById = new Map(terms.map((term) => [term.id, term.name]));

    return links
      .map((link) => link.termId)
      .filter((termId) => allowedTermIds.has(termId))
      .map((termId) => termNameById.get(termId))
      .filter((name): name is string => typeof name === "string");
  }
  @Get("navigation-items")
  async listNavigationItems(): Promise<PublicNavigationItemDto[]> {
    const items = await this.navigation.findMany();
    return items.map((item) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      order: item.order,
      parentId: item.parentId,
    }));
  }

  @Get("settings")
  async listSettings(): Promise<PublicSiteSettingDto[]> {
    const settings = await this.settings.findMany();
    const allowed = new Set<string>(PUBLIC_SITE_SETTING_KEYS);
    return settings
      .filter((setting) => allowed.has(setting.key))
      .map((setting) => ({ key: setting.key, value: setting.value }));
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

  private mapPublicContentItem(item: ContentItem): PublicContentItemDto {
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
      body: typeof data.body === "string" ? data.body : "",
      shortDescription:
        typeof data.shortDescription === "string" ? data.shortDescription : "",
      featuredImage:
        typeof data.featuredImage === "string" ? data.featuredImage : null,
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
      publishedAt,
      canonicalUrl: item.canonicalUrl,
      noIndex: item.noIndex,
      updatedAt: item.updatedAt,
      ...(item.parentId ? { parentId: item.parentId } : {}),
    };
  }

  private mapPublicContentItemTree(
    item: ContentItemTreeNode,
  ): PublicContentItemTreeDto {
    return {
      ...this.mapPublicContentItem(item),
      children: item.children.map((child) =>
        this.mapPublicContentItemTree(child),
      ),
    };
  }

  private filterPublishedContentItemTree(
    nodes: ContentItemTreeNode[],
  ): ContentItemTreeNode[] {
    return nodes
      .filter((node) => node.published)
      .map((node) => ({
        ...node,
        children: this.filterPublishedContentItemTree(node.children),
      }));
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
