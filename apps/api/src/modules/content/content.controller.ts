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
  Put,
  Query,
  Req,
  ForbiddenException,
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
  TaxonomiesRepository,
  TermsRepository,
  ContentItemTermsRepository,
} from "@org/domain";
import { MediaService } from "./media.service";
import { AuthService } from "../auth/auth.service";
import {
  requireMinimumRole,
  requireSuperAdmin,
} from "../../common/auth/admin-access";
import type { Request } from "express";

type MediaUsageContext =
  | { kind: "page"; pageTitle: string; blockIndex: number; blockType: string }
  | {
      kind: "content";
      contentType: string;
      itemTitle: string;
      fieldKey: string;
    };

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;
}

const CONTENT_FIELD_TYPES = [
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
] as const;

const RELATION_TARGET_TYPES = ["contentType", "page", "media"] as const;

class ContentFieldRelationDto {
  @ApiProperty({ enum: RELATION_TARGET_TYPES })
  @IsString()
  @IsIn(RELATION_TARGET_TYPES)
  targetType!: (typeof RELATION_TARGET_TYPES)[number];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetSlug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetModel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  multiple?: boolean;
}

class ContentFieldDefinitionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  placeholder?: string;

  @ApiProperty({ enum: CONTENT_FIELD_TYPES })
  @IsString()
  @IsIn(CONTENT_FIELD_TYPES)
  type!: (typeof CONTENT_FIELD_TYPES)[number];

  @ApiProperty()
  @IsBoolean()
  required!: boolean;

  @ApiProperty({ required: false, type: ContentFieldRelationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentFieldRelationDto)
  relation?: ContentFieldRelationDto;
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;
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
  parentId?: string | null;

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
  parentId?: string | null;

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

class CreateTaxonomyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

class UpdateTaxonomyDto {
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
}

class CreateTermDto {
  @ApiProperty()
  @IsString()
  taxonomyId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class UpdateTermDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxonomyId?: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  parentId?: string;
}

class AssignTermsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  termIds!: string[];
}

class ListTermsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxonomyId?: string;
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
    @Inject("TaxonomiesRepository")
    private readonly taxonomies: TaxonomiesRepository,
    @Inject("TermsRepository")
    private readonly terms: TermsRepository,
    @Inject("ContentItemTermsRepository")
    private readonly contentItemTerms: ContentItemTermsRepository,
    @Inject("NavigationItemsRepository")
    private readonly navigation: NavigationItemsRepository,
    @Inject("SiteSettingsRepository")
    private readonly settings: SiteSettingsRepository,
    @Inject("MediaRepository")
    private readonly media: MediaRepository,
    private readonly mediaService: MediaService,
    private readonly auth: AuthService,
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
  async createPage(@Req() req: Request, @Body() body: CreatePageDto) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    if (body.templateKey !== undefined && role !== "super_admin") {
      throw new ForbiddenException(
        "Access denied: only super_admin can modify page templates.",
      );
    }
    await this.validatePageBlocksMediaAlt(body.title, body.blocks);
    return this.pages.create({
      ...body,
      templateKey: body.templateKey ?? null,
      noIndex: body.noIndex ?? false,
    });
  }

  @Patch("pages/:id")
  async updatePage(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdatePageDto,
  ) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    if (body.templateKey !== undefined && role !== "super_admin") {
      throw new ForbiddenException(
        "Access denied: only super_admin can modify page templates.",
      );
    }
    if (body.blocks) {
      const page = await this.pages.findById(id);
      if (!page) {
        throw new BadRequestException("Page not found.");
      }
      await this.validatePageBlocksMediaAlt(
        body.title ?? page.title,
        body.blocks,
      );
    }

    return this.pages.update(id, body);
  }

  @Delete("pages/:id")
  async deletePage(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
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
  async createContentType(
    @Req() req: Request,
    @Body() body: CreateContentTypeDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    await this.validateContentTypeFields(body.fields);
    return this.contentTypes.create({
      ...body,
      templateKey: body.templateKey ?? null,
    });
  }

  @Patch("types/:id")
  async updateContentType(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateContentTypeDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    if (body.fields) {
      await this.validateContentTypeFields(body.fields);
    }

    return this.contentTypes.update(id, body);
  }

  @Delete("types/:id")
  async deleteContentType(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
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
    const result = await this.contentItems.findBySlugOrRedirect(
      contentTypeSlug,
      slug,
    );
    if (!result) {
      return null;
    }

    if (result.kind === "redirect") {
      if (contentTypeSlug === "news") {
        return {
          redirectTo: `/news/${result.destinationSlug}`,
          permanent: true,
        };
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
      return typeof imageUrl === "string" && imageUrl.trim()
        ? [imageUrl.trim()]
        : [];
    }

    return [];
  }

  private async getMediaByUrlMap(): Promise<
    Map<string, { id: string; alt: string }>
  > {
    const media = await this.media.findMany();
    return new Map(
      media.map((item) => [item.url, { id: item.id, alt: item.alt }]),
    );
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

  private async getReferencedMediaUsage(): Promise<
    Map<string, MediaUsageContext[]>
  > {
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
      const imageFields = contentType.fields.filter(
        (field: ContentFieldDefinition) => field.type === "image",
      );
      if (imageFields.length === 0) {
        continue;
      }

      const items = await this.contentItems.findManyByContentTypeId(
        contentType.id,
      );
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

  private async validateMediaAltBeforeUpdate(
    mediaId: string,
    nextAlt: string | undefined,
  ) {
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

  private async validateContentTypeFields(
    fields: ContentFieldDefinition[],
  ): Promise<void> {
    for (const field of fields) {
      if (
        field.type !== "relation" &&
        field.type !== "contentItem" &&
        field.type !== "media" &&
        field.type !== "page"
      ) {
        continue;
      }

      const relation =
        field.type === "relation"
          ? field.relation
          : {
              targetType:
                field.type === "contentItem"
                  ? ("contentType" as const)
                  : field.type,
              ...(field.relation?.targetSlug
                ? { targetSlug: field.relation.targetSlug }
                : {}),
              ...(field.relation?.targetModel
                ? { targetModel: field.relation.targetModel }
                : {}),
              ...(field.relation?.multiple ? { multiple: true } : {}),
            };

      if (!relation) {
        throw new BadRequestException(
          `Field ${field.key} requires relation configuration.`,
        );
      }

      if (relation.targetType === "contentType") {
        const targetSlug = relation.targetSlug?.trim();
        const targetModel = relation.targetModel?.trim();
        const resolvedTarget = targetSlug || targetModel;
        if (!resolvedTarget) {
          throw new BadRequestException(
            `Field ${field.key} requires relation.targetSlug or relation.targetModel when targetType is contentType.`,
          );
        }

        const target = await this.contentTypes.findBySlug(resolvedTarget);
        if (!target) {
          throw new BadRequestException(
            `Field ${field.key} references unknown content type slug: ${resolvedTarget}.`,
          );
        }
      }
    }
  }

  private async validateContentItemData(
    fields: ContentFieldDefinition[],
    data: Record<string, unknown>,
  ) {
    const mediaByUrl = await this.getMediaByUrlMap();

    const normalizeRelationIds = (
      field: ContentFieldDefinition,
      value: unknown,
    ): string[] => {
      const multiple = Boolean(field.relation?.multiple);

      if (multiple) {
        if (!Array.isArray(value)) {
          throw new BadRequestException(
            `Field ${field.key} must be an array of reference ids.`,
          );
        }

        const ids = value.map((entry) => {
          if (typeof entry !== "string") {
            throw new BadRequestException(
              `Field ${field.key} must contain only string reference ids.`,
            );
          }

          return entry.trim();
        });

        const filtered = ids.filter(Boolean);
        if (field.required && filtered.length === 0) {
          throw new BadRequestException(`Missing required field: ${field.key}`);
        }

        return filtered;
      }

      if (typeof value !== "string") {
        throw new BadRequestException(`Field ${field.key} must be a string.`);
      }

      const normalized = value.trim();
      if (!normalized) {
        if (field.required) {
          throw new BadRequestException(`Missing required field: ${field.key}`);
        }
        return [];
      }

      return [normalized];
    };

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

      if (field.type === "boolean") {
        if (typeof value !== "boolean") {
          throw new BadRequestException(
            `Field ${field.key} must be a boolean.`,
          );
        }
        continue;
      }

      if (field.type === "image") {
        if (typeof value !== "string") {
          throw new BadRequestException(`Field ${field.key} must be a string.`);
        }

        const normalized = value.trim();
        const matchedMedia = mediaByUrl.get(normalized);
        if (matchedMedia && !matchedMedia.alt.trim()) {
          throw new BadRequestException(
            `Field ${field.key} references media without alt text. Update that media item before saving.`,
          );
        }
        continue;
      }

      if (
        field.type !== "relation" &&
        field.type !== "media" &&
        field.type !== "contentItem" &&
        field.type !== "page"
      ) {
        if (typeof value !== "string") {
          throw new BadRequestException(`Field ${field.key} must be a string.`);
        }
        continue;
      }

      const relation =
        field.type === "relation"
          ? field.relation
          : {
              targetType:
                field.type === "contentItem"
                  ? ("contentType" as const)
                  : field.type,
              ...(field.relation?.targetSlug
                ? { targetSlug: field.relation.targetSlug }
                : {}),
              ...(field.relation?.targetModel
                ? { targetModel: field.relation.targetModel }
                : {}),
              ...(field.relation?.multiple ? { multiple: true } : {}),
            };

      if (!relation) {
        throw new BadRequestException(
          `Field ${field.key} requires relation configuration.`,
        );
      }

      const ids = normalizeRelationIds(field, value);
      for (const refId of ids) {
        if (relation.targetType === "page") {
          const page = await this.pages.findById(refId);
          if (!page) {
            throw new BadRequestException(
              `Field ${field.key} references missing page.`,
            );
          }
          continue;
        }

        if (relation.targetType === "media") {
          const media = await this.media.findById(refId);
          if (!media) {
            throw new BadRequestException(
              `Field ${field.key} references missing media.`,
            );
          }
          if (!media.alt.trim()) {
            throw new BadRequestException(
              `Field ${field.key} references media without alt text. Update that media item before saving.`,
            );
          }
          continue;
        }

        if (relation.targetType === "contentType") {
          const targetSlug = relation.targetSlug?.trim();
          const targetModel = relation.targetModel?.trim();
          const resolvedTarget = targetSlug || targetModel;
          if (!resolvedTarget) {
            throw new BadRequestException(
              `Field ${field.key} requires relation.targetSlug or relation.targetModel when targetType is contentType.`,
            );
          }

          const targetContentType =
            await this.contentTypes.findBySlug(resolvedTarget);
          if (!targetContentType) {
            throw new BadRequestException(
              `Field ${field.key} references unknown content type slug: ${resolvedTarget}.`,
            );
          }

          const referencedItem = await this.contentItems.findById(refId);
          if (
            !referencedItem ||
            referencedItem.contentTypeId !== targetContentType.id
          ) {
            throw new BadRequestException(
              `Field ${field.key} must reference an item from content type: ${resolvedTarget}.`,
            );
          }
        }
      }
    }
  }

  @Post("items")
  async createContentItem(
    @Req() req: Request,
    @Body() body: CreateContentItemDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    const contentType = await this.contentTypes.findById(body.contentTypeId);
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    await this.validateContentItemData(contentType.fields, body.data);
    await this.validateContentItemParent(
      body.contentTypeId,
      body.parentId ?? null,
    );
    return this.contentItems.create({
      ...body,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      noIndex: body.noIndex ?? false,
    });
  }

  @Patch("items/:id")
  async updateContentItem(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateContentItemDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
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
    await this.validateContentItemParent(
      contentTypeId,
      body.parentId === undefined ? existing.parentId : body.parentId,
      existing.id,
    );
    return this.contentItems.update(id, body);
  }

  private async validateContentItemParent(
    contentTypeId: string,
    parentId: string | null,
    itemId?: string,
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    if (itemId && parentId === itemId) {
      throw new BadRequestException("Content item cannot be its own parent.");
    }

    const parent = await this.contentItems.findById(parentId);
    if (!parent) {
      throw new BadRequestException("Parent content item not found.");
    }

    if (parent.contentTypeId !== contentTypeId) {
      throw new BadRequestException(
        "Parent content item must belong to the same content type.",
      );
    }

    if (!itemId) {
      return;
    }

    const visited = new Set<string>([itemId]);
    let current: ContentItem | null = parent;

    while (current?.parentId) {
      if (visited.has(current.id)) {
        throw new BadRequestException(
          "Invalid hierarchy: parent relationship would create a cycle.",
        );
      }

      visited.add(current.id);
      current = await this.contentItems.findById(current.parentId);
    }
  }

  @Delete("items/:id")
  async deleteContentItem(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    await this.contentItems.delete(id);
    return { ok: true };
  }

  @Get("taxonomies")
  listTaxonomies() {
    return this.taxonomies.findMany();
  }

  @Get("taxonomies/:id")
  getTaxonomy(@Param("id") id: string) {
    return this.taxonomies.findById(id);
  }

  @Post("taxonomies")
  async createTaxonomy(@Req() req: Request, @Body() body: CreateTaxonomyDto) {
    await requireSuperAdmin(req, this.auth);
    return this.taxonomies.create(body);
  }

  @Patch("taxonomies/:id")
  async updateTaxonomy(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateTaxonomyDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    return this.taxonomies.update(id, body);
  }

  @Delete("taxonomies/:id")
  async deleteTaxonomy(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
    await this.taxonomies.delete(id);
    return { ok: true };
  }

  @Get("terms")
  listTerms(@Query() query: ListTermsQueryDto) {
    if (query.taxonomyId) {
      return this.terms.findManyByTaxonomyId(query.taxonomyId);
    }
    return this.terms.findMany();
  }

  @Get("terms/:id")
  getTerm(@Param("id") id: string) {
    return this.terms.findById(id);
  }

  @Post("terms")
  async createTerm(@Req() req: Request, @Body() body: CreateTermDto) {
    await requireSuperAdmin(req, this.auth);
    return this.terms.create({ ...body, parentId: body.parentId ?? null });
  }

  @Patch("terms/:id")
  async updateTerm(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateTermDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    return this.terms.update(id, body);
  }

  @Delete("terms/:id")
  async deleteTerm(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
    await this.terms.delete(id);
    return { ok: true };
  }

  @Get("items/:id/terms")
  async listContentItemTerms(@Param("id") id: string) {
    const assignments = await this.contentItemTerms.findManyByContentItemId(id);
    const terms = await this.terms.findManyByIds(
      assignments.map((entry) => entry.termId),
    );
    const termsById = new Map(terms.map((term) => [term.id, term]));

    return assignments.flatMap((entry) => {
      const term = termsById.get(entry.termId);
      return term ? [term] : [];
    });
  }

  @Put("items/:id/terms")
  async assignContentItemTerms(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: AssignTermsDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    const item = await this.contentItems.findById(id);
    if (!item) {
      throw new BadRequestException("Content item not found.");
    }

    return this.contentItemTerms.assign(id, body.termIds);
  }

  @Delete("items/:id/terms/:termId")
  async removeContentItemTerm(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("termId") termId: string,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    await this.contentItemTerms.remove(id, termId);
    return { ok: true };
  }

  @Get("navigation-items")
  listNavigationItems() {
    return this.navigation.findMany();
  }

  @Post("navigation-items")
  async createNavigationItem(
    @Req() req: Request,
    @Body() body: CreateNavigationItemDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.navigation.create({ ...body, parentId: body.parentId ?? null });
  }

  @Patch("navigation-items/:id")
  async updateNavigationItem(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateNavigationItemDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.navigation.update(id, body);
  }

  @Delete("navigation-items/:id")
  async deleteNavigationItem(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    await this.navigation.delete(id);
    return { ok: true };
  }

  @Get("settings")
  async listSettings(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.settings.findMany();
  }

  @Get("settings/:key")
  async getSetting(@Req() req: Request, @Param("key") key: string) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.settings.findByKey(key);
  }

  @Post("settings")
  async upsertSetting(@Req() req: Request, @Body() body: UpsertSiteSettingDto) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.settings.upsert(body);
  }

  @Delete("settings/:key")
  async deleteSetting(@Req() req: Request, @Param("key") key: string) {
    await requireMinimumRole(req, this.auth, "admin");
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
  async createMedia(@Req() req: Request, @Body() body: CreateMediaDto) {
    await requireMinimumRole(req, this.auth, "editor");
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
  async updateMedia(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateMediaDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    await this.validateMediaAltBeforeUpdate(id, body.alt);
    return this.media.update(id, body);
  }

  @Delete("media/:id")
  async deleteMedia(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    await this.mediaService.delete(id);
    return { ok: true };
  }
}
