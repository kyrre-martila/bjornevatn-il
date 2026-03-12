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
  canonicalUrl: string | null;
  noIndex: boolean;
  data: Record<string, unknown>;
  updatedAt: Date;
  parentId?: string;
};

type PublicContentItemTreeDto = PublicContentItemDto & {
  children: PublicContentItemTreeDto[];
};

class PublicSiteSettingDto {
  key!: string;
  value!: string;
}

@ApiTags("content")
@Controller("content")
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
  ) {}

  @Get("pages")
  async listPages() {
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
  async listContentTypes() {
    const types = await this.contentTypes.findMany();
    return types.map((type) => ({
      slug: type.slug,
      name: type.name,
      templateKey: type.templateKey,
    }));
  }

  @Get("items/type-slug/:slug")
  async listContentItemsByTypeSlug(
    @Param("slug") slug: string,
    @Query() query: PublicListContentItemsQueryDto,
  ) {
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

  @Get("navigation-items")
  listNavigationItems() {
    return this.navigation.findMany();
  }

  @Get("settings")
  async listSettings(): Promise<PublicSiteSettingDto[]> {
    const settings = await this.settings.findMany();
    const allowed = new Set<string>(PUBLIC_SITE_SETTING_KEYS);
    return settings.filter((setting) => allowed.has(setting.key));
  }

  private mapPublicPage(page: Page) {
    return {
      slug: page.slug,
      title: page.title,
      templateKey: page.templateKey,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      seoImage: page.seoImage,
      canonicalUrl: page.canonicalUrl,
      noIndex: page.noIndex,
      blocks: page.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        order: block.order,
        data: block.data,
      })),
    };
  }

  private mapPublicContentItem(item: ContentItem): PublicContentItemDto {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      canonicalUrl: item.canonicalUrl,
      noIndex: item.noIndex,
      data: item.data,
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
}
