import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  BadRequestException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type {
  ContentItemsRepository,
  ContentTypesRepository,
  MediaRepository,
  NavigationItemsRepository,
  PagesRepository,
  SiteSettingsRepository,
  ContentFieldDefinition,
  ContentItem,
  ContentItemTreeNode,
} from "@org/domain";
import { MediaService } from "./media.service";



type MediaUsageContext =
  | { kind: "page"; pageTitle: string; blockIndex: number; blockType: string }
  | { kind: "content"; contentType: string; itemTitle: string; fieldKey: string };

const PAGE_BLOCK_TYPES = [
  "hero",
  "rich_text",
  "cta",
  "image",
  "news_list",
] as const;

class PageBlockInputDto {
  @ApiProperty({ enum: PAGE_BLOCK_TYPES })
  @IsString()
  @IsIn(PAGE_BLOCK_TYPES)
  type!: (typeof PAGE_BLOCK_TYPES)[number];

  @ApiProperty({ type: Object })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;
}

class CreatePageDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ type: [PageBlockInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageBlockInputDto)
  blocks!: PageBlockInputDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty()
  @IsBoolean()
  published!: boolean;
}

class UpdatePageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, type: [PageBlockInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageBlockInputDto)
  blocks?: PageBlockInputDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

const CONTENT_FIELD_TYPES = [
  "text",
  "textarea",
  "rich_text",
  "image",
  "date",
  "boolean",
] as const;

class ContentFieldDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ enum: CONTENT_FIELD_TYPES })
  @IsString()
  @IsIn(CONTENT_FIELD_TYPES)
  type!: (typeof CONTENT_FIELD_TYPES)[number];

  @ApiProperty()
  @IsBoolean()
  required!: boolean;
}

class CreateContentTypeDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ type: [ContentFieldDefinitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentFieldDefinitionDto)
  fields!: ContentFieldDefinitionDto[];
}

class UpdateContentTypeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [ContentFieldDefinitionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentFieldDefinitionDto)
  fields?: ContentFieldDefinitionDto[];
}

class CreateContentItemDto {
  @ApiProperty()
  @IsString()
  contentTypeId!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ type: Object })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty()
  @IsBoolean()
  published!: boolean;
}

class UpdateContentItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentTypeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seoImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

class ListContentItemsQueryDto {
  @ApiProperty({ required: false, enum: ["flat", "tree"], default: "flat" })
  @IsOptional()
  @IsString()
  @IsIn(["flat", "tree"])
  mode?: "flat" | "tree";
}

class CreateNavigationItemDto {
  @ApiProperty()
  @IsString()
  label!: string;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  order!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpdateNavigationItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpsertSiteSettingDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;
}

class CreateMediaDto {
  @ApiProperty()
  @IsUrl()
  url!: string;

  @ApiProperty()
  @IsString()
  alt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storageKey?: string;
}

class UpdateMediaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  originalFilename?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  storageKey?: string;
}

@ApiTags("content")
@Controller("content")
export class ContentController {
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
    @Inject("MediaRepository")
    private readonly media: MediaRepository,
    private readonly mediaService: MediaService,
  ) {}

  @Get("pages")
  listPages() {
    return this.pages.findMany();
  }

  @Get("pages/:id")
  getPage(@Param("id") id: string) {
    return this.pages.findById(id);
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

    return result.entity;
  }

  @Post("pages")
  async createPage(@Body() body: CreatePageDto) {
    await this.validatePageBlocksMediaAlt(body.title, body.blocks);
    return this.pages.create({ ...body, noIndex: body.noIndex ?? false });
  }

  @Patch("pages/:id")
  async updatePage(@Param("id") id: string, @Body() body: UpdatePageDto) {
    if (body.blocks) {
      const page = await this.pages.findById(id);
      if (!page) {
        throw new BadRequestException("Page not found.");
      }
      await this.validatePageBlocksMediaAlt(body.title ?? page.title, body.blocks);
    }

    return this.pages.update(id, body);
  }

  @Delete("pages/:id")
  async deletePage(@Param("id") id: string) {
    await this.pages.delete(id);
    return { ok: true };
  }

  @Get("types")
  listContentTypes() {
    return this.contentTypes.findMany();
  }

  @Get("types/:id")
  getContentType(@Param("id") id: string) {
    return this.contentTypes.findById(id);
  }

  @Post("types")
  createContentType(@Body() body: CreateContentTypeDto) {
    return this.contentTypes.create(body);
  }

  @Patch("types/:id")
  updateContentType(
    @Param("id") id: string,
    @Body() body: UpdateContentTypeDto,
  ) {
    return this.contentTypes.update(id, body);
  }

  @Delete("types/:id")
  async deleteContentType(@Param("id") id: string) {
    const items = await this.contentItems.findManyByContentTypeId(id);
    if (items.length > 0) {
      throw new ConflictException(
        "Cannot delete content type with existing content items.",
      );
    }

    await this.contentTypes.delete(id);
    return { ok: true };
  }

  @Get("items")
  async listContentItems(@Query() query: ListContentItemsQueryDto) {
    const items = await this.contentItems.findMany();
    if (query.mode === "tree") {
      return this.toContentItemTree(items);
    }

    return items;
  }

  @Get("items/:id")
  getContentItem(@Param("id") id: string) {
    return this.contentItems.findById(id);
  }

  @Get("items/type/:contentTypeId")
  listContentItemsByTypeId(
    @Param("contentTypeId") contentTypeId: string,
    @Query() query: ListContentItemsQueryDto,
  ) {
    if (query.mode === "tree") {
      return this.contentItems.findTreeByContentTypeId(contentTypeId);
    }

    return this.contentItems.findManyByContentTypeId(contentTypeId);
  }

  @Get("items/type-slug/:slug")
  async listContentItemsByTypeSlug(
    @Param("slug") slug: string,
    @Query() query: ListContentItemsQueryDto,
  ) {
    if (query.mode === "tree") {
      const items = await this.contentItems.findTreeByContentTypeSlug(slug);
      return this.filterPublishedContentItemTree(items);
    }

    const items = await this.contentItems.findManyByContentTypeSlug(slug);
    return items.filter((item) => item.published);
  }

  @Get("items/type-slug/:contentTypeSlug/:slug")
  async getContentItemBySlug(
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("slug") slug: string,
  ) {
    const result = await this.contentItems.findBySlugOrRedirect(contentTypeSlug, slug);
    if (!result) {
      return null;
    }

    if (result.kind === "redirect") {
      if (contentTypeSlug === "news") {
        return { redirectTo: `/news/${result.destinationSlug}`, permanent: true };
      }
      return {
        redirectTo: `/content/${encodeURIComponent(contentTypeSlug)}/${encodeURIComponent(result.destinationSlug)}`,
        permanent: true,
      };
    }

    return result.entity;
  }

  private toContentItemTree(items: ContentItem[]): ContentItemTreeNode[] {
    const nodes = new Map<string, ContentItemTreeNode>();
    const roots: ContentItemTreeNode[] = [];

    for (const item of items) {
      nodes.set(item.id, { ...item, children: [] });
    }

    for (const item of items) {
      const node = nodes.get(item.id);
      if (!node) {
        continue;
      }

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

    const sortNodes = (entries: ContentItemTreeNode[]) => {
      entries.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      for (const entry of entries) {
        sortNodes(entry.children);
      }
    };

    sortNodes(roots);
    return roots;
  }

  private filterPublishedContentItemTree(nodes: ContentItemTreeNode[]): ContentItemTreeNode[] {
    return nodes
      .filter((node) => node.published)
      .map((node) => ({
        ...node,
        children: this.filterPublishedContentItemTree(node.children),
      }));
  }

  private extractPageBlockMediaUrls(block: {
    type: string;
    data: Record<string, unknown>;
  }): string[] {
    if (block.type === "image") {
      const src = block.data.src;
      return typeof src === "string" && src.trim() ? [src.trim()] : [];
    }

    if (block.type === "hero") {
      const imageUrl = block.data.imageUrl;
      return typeof imageUrl === "string" && imageUrl.trim() ? [imageUrl.trim()] : [];
    }

    return [];
  }

  private async getMediaByUrlMap(): Promise<Map<string, { id: string; alt: string }>> {
    const media = await this.media.findMany();
    return new Map(media.map((item) => [item.url, { id: item.id, alt: item.alt }]));
  }

  private async validatePageBlocksMediaAlt(
    pageTitle: string,
    blocks: Array<{ type: string; data: Record<string, unknown> }>,
  ): Promise<void> {
    const mediaByUrl = await this.getMediaByUrlMap();

    for (const [index, block] of blocks.entries()) {
      const urls = this.extractPageBlockMediaUrls(block);
      for (const url of urls) {
        const matched = mediaByUrl.get(url);
        if (matched && !matched.alt.trim()) {
          throw new BadRequestException(
            `Page block #${index + 1} (${block.type}) references media without alt text. Update that media item's alt text before saving.`,
          );
        }
      }
    }
  }

  private async getReferencedMediaUsage(): Promise<Map<string, MediaUsageContext[]>> {
    const usage = new Map<string, MediaUsageContext[]>();

    const pages = await this.pages.findMany();
    for (const page of pages) {
      for (const [index, block] of page.blocks.entries()) {
        const urls = this.extractPageBlockMediaUrls({
          type: block.type,
          data: block.data,
        });

        for (const url of urls) {
          const entries = usage.get(url) ?? [];
          entries.push({
            kind: "page",
            pageTitle: page.title,
            blockIndex: index + 1,
            blockType: block.type,
          });
          usage.set(url, entries);
        }
      }
    }

    const contentTypes = await this.contentTypes.findMany();
    for (const contentType of contentTypes) {
      const imageFields = contentType.fields.filter((field: ContentFieldDefinition) => field.type === "image");
      if (imageFields.length === 0) {
        continue;
      }

      const items = await this.contentItems.findManyByContentTypeId(contentType.id);
      for (const item of items) {
        for (const field of imageFields) {
          const value = item.data[field.key];
          if (typeof value !== "string" || !value.trim()) {
            continue;
          }

          const entries = usage.get(value.trim()) ?? [];
          entries.push({
            kind: "content",
            contentType: contentType.name,
            itemTitle: item.title,
            fieldKey: field.key,
          });
          usage.set(value.trim(), entries);
        }
      }
    }

    return usage;
  }

  private async validateMediaAltBeforeUpdate(mediaId: string, nextAlt: string | undefined) {
    if (nextAlt === undefined || nextAlt.trim()) {
      return;
    }

    const mediaItem = await this.media.findById(mediaId);
    if (!mediaItem) {
      throw new BadRequestException("Media item not found.");
    }

    const usage = await this.getReferencedMediaUsage();
    if (!usage.has(mediaItem.url)) {
      return;
    }

    throw new BadRequestException(
      "Alt text is required for media used in page blocks or content items.",
    );
  }

  private async validateContentItemData(
    fields: ContentFieldDefinition[],
    data: Record<string, unknown>,
  ) {
    const mediaByUrl = await this.getMediaByUrlMap();

    for (const field of fields) {
      const value = data[field.key];
      if (
        field.required &&
        (value === undefined || value === null || value === "")
      ) {
        throw new BadRequestException(`Missing required field: ${field.key}`);
      }

      if (value === undefined || value === null || value === "") {
        continue;
      }

      if (field.type === "image" && typeof value === "string") {
        const matchedMedia = mediaByUrl.get(value.trim());
        if (matchedMedia && !matchedMedia.alt.trim()) {
          throw new BadRequestException(
            `Field ${field.key} references media without alt text. Update that media item before saving.`,
          );
        }
      }

      if (field.type === "boolean" && typeof value !== "boolean") {
        throw new BadRequestException(`Field ${field.key} must be a boolean.`);
      }

      if (field.type !== "boolean" && typeof value !== "string") {
        throw new BadRequestException(`Field ${field.key} must be a string.`);
      }
    }
  }

  @Post("items")
  async createContentItem(@Body() body: CreateContentItemDto) {
    const contentType = await this.contentTypes.findById(body.contentTypeId);
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    await this.validateContentItemData(contentType.fields, body.data);
    return this.contentItems.create({
      ...body,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      noIndex: body.noIndex ?? false,
    });
  }

  @Patch("items/:id")
  async updateContentItem(
    @Param("id") id: string,
    @Body() body: UpdateContentItemDto,
  ) {
    const existing = await this.contentItems.findById(id);
    if (!existing) {
      throw new BadRequestException("Content item not found.");
    }

    const contentTypeId = body.contentTypeId ?? existing.contentTypeId;
    const contentType = await this.contentTypes.findById(contentTypeId);
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    const data = body.data ?? existing.data;
    await this.validateContentItemData(contentType.fields, data);
    return this.contentItems.update(id, body);
  }

  @Delete("items/:id")
  async deleteContentItem(@Param("id") id: string) {
    await this.contentItems.delete(id);
    return { ok: true };
  }

  @Get("navigation-items")
  listNavigationItems() {
    return this.navigation.findMany();
  }

  @Post("navigation-items")
  createNavigationItem(@Body() body: CreateNavigationItemDto) {
    return this.navigation.create({ ...body, parentId: body.parentId ?? null });
  }

  @Patch("navigation-items/:id")
  updateNavigationItem(
    @Param("id") id: string,
    @Body() body: UpdateNavigationItemDto,
  ) {
    return this.navigation.update(id, body);
  }

  @Delete("navigation-items/:id")
  async deleteNavigationItem(@Param("id") id: string) {
    await this.navigation.delete(id);
    return { ok: true };
  }

  @Get("settings")
  listSettings() {
    return this.settings.findMany();
  }

  @Get("settings/:key")
  getSetting(@Param("key") key: string) {
    return this.settings.findByKey(key);
  }

  @Post("settings")
  upsertSetting(@Body() body: UpsertSiteSettingDto) {
    return this.settings.upsert(body);
  }

  @Delete("settings/:key")
  async deleteSetting(@Param("key") key: string) {
    await this.settings.delete(key);
    return { ok: true };
  }

  @Get("media")
  async listMedia() {
    const [mediaItems, usage] = await Promise.all([
      this.media.findMany(),
      this.getReferencedMediaUsage(),
    ]);

    return mediaItems.map((item) => ({
      ...item,
      isUsed: usage.has(item.url),
    }));
  }

  @Get("media/:id")
  getMedia(@Param("id") id: string) {
    return this.media.findById(id);
  }

  @Post("media")
  createMedia(@Body() body: CreateMediaDto) {
    return this.media.create({
      ...body,
      width: body.width ?? null,
      height: body.height ?? null,
      mimeType: body.mimeType ?? null,
      sizeBytes: body.sizeBytes ?? null,
      originalFilename: body.originalFilename ?? null,
      storageKey: body.storageKey ?? null,
    });
  }

  @Patch("media/:id")
  async updateMedia(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    await this.validateMediaAltBeforeUpdate(id, body.alt);
    return this.media.update(id, body);
  }

  @Delete("media/:id")
  async deleteMedia(@Param("id") id: string) {
    await this.mediaService.delete(id);
    return { ok: true };
  }
}
