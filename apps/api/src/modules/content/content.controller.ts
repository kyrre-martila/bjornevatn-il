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
  IsNumber,
  IsString,
  IsUrl,
  IsDateString,
  Matches,
  Min,
  ValidateNested,
  Max,
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
import { MediaUsageService } from "./media-usage.service";
import { AuthService } from "../auth/auth.service";
import { AuditService } from "../audit/audit.service";
import {
  requireMinimumRole,
  requireSuperAdmin,
} from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import type { Request } from "express";

const PAGE_BLOCK_TYPES = [
  "hero",
  "rich_text",
  "cta",
  "image",
  "news_list",
] as const;

const ROUTE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROUTE_SLUG_VALIDATION_MESSAGE =
  "Slug must contain lowercase letters, numbers, and hyphens only.";
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

const WORKFLOW_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

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
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false, enum: WORKFLOW_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(WORKFLOW_STATUSES)
  workflowStatus?: WorkflowStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  unpublishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;
}

class UpdatePageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false, enum: WORKFLOW_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(WORKFLOW_STATUSES)
  workflowStatus?: WorkflowStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  unpublishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  revisionNote?: string;
}

type PageBlockPayload = {
  type: (typeof PAGE_BLOCK_TYPES)[number];
  data: Record<string, unknown>;
  order: number;
};

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

const ADMIN_EDITABLE_SETTING_KEYS = new Set([
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
  "staging_enabled",
  "staging_base_url",
  "staging_requires_auth",
]);

const PROTECTED_SETTING_PREFIXES = [
  "system_",
  "template_",
  "security_",
] as const;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  helpText?: string;

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
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class UpdateContentTypeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class CreateContentItemDto {
  @ApiProperty()
  @IsString()
  contentTypeId!: string;

  @ApiProperty()
  @IsString()
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false, enum: WORKFLOW_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(WORKFLOW_STATUSES)
  workflowStatus?: WorkflowStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  unpublishAt?: string | null;
}

class UpdateContentItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentTypeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(ROUTE_SLUG_PATTERN, { message: ROUTE_SLUG_VALIDATION_MESSAGE })
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

  @ApiProperty({ required: false, enum: WORKFLOW_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(WORKFLOW_STATUSES)
  workflowStatus?: WorkflowStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  publishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  unpublishAt?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  revisionNote?: string;
}

class AdminListQueryDto {
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

class RestoreRevisionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  revisionNote?: string;
}

class ListContentItemsQueryDto {
  @ApiProperty({ required: false, enum: ["flat", "tree"], default: "flat" })
  @IsOptional()
  @IsString()
  @IsIn(["flat", "tree"])
  mode?: "flat" | "tree";

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
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
  @IsNumber()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
}

class ListMediaQueryDto {
  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
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
  @IsNumber()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cursor?: string;
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
@Controller("admin/content")
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
    private readonly mediaUsageService: MediaUsageService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get("pages")
  async listPages(@Req() req: Request, @Query() query: AdminListQueryDto) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.pages.findMany(this.buildPagination(query));
  }

  @Get("pages/:id")
  async getPage(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.pages.findById(id);
  }

  @Get("pages/:id/revisions")
  async listPageRevisions(
    @Req() req: Request,
    @Param("id") id: string,
    @Query() query: AdminListQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.pages.listRevisions(id, this.buildPagination(query));
  }

  @Get("pages/:id/revisions/:revisionId")
  async getPageRevision(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("revisionId") revisionId: string,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.pages.findRevisionById(id, revisionId);
  }

  @Post("pages/:id/revisions/:revisionId/restore")
  async restorePageRevision(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("revisionId") revisionId: string,
    @Body() body: RestoreRevisionDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const userId = await this.getCurrentUserId(req);
    const restored = await this.pages.restoreRevision(
      id,
      revisionId,
      userId,
      body.revisionNote,
    );
    this.audit.log({
      userId,
      action: "revision_restore",
      entityType: "page",
      entityId: id,
      metadata: { revisionId },
    });
    return restored;
  }

  @Get("pages/slug/:slug")
  async getPageBySlug(@Req() req: Request, @Param("slug") slug: string) {
    await requireMinimumRole(req, this.auth, "editor");
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
    if (body.templateKey !== undefined && role !== "superadmin") {
      throw new ForbiddenException(
        "Access denied: only superadmin can modify page templates.",
      );
    }
    await this.ensurePageSlugDoesNotConflict(body.slug);
    await this.validatePageBlocksMediaAlt(body.title, body.blocks);
    const normalizedBody = this.normalizePublishingWindow(body);
    const workflowUpdate = this.resolveWorkflowUpdate(
      role,
      undefined,
      undefined,
      body.workflowStatus,
      body.published,
    );
    const page = await this.pages.create({
      ...normalizedBody,
      ...workflowUpdate,
      templateKey: body.templateKey ?? null,
      noIndex: body.noIndex ?? false,
    });
    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "page_create",
      entityType: "page",
      entityId: page.id,
      metadata: { slug: page.slug, published: page.published },
    });
    if (page.published) {
      this.audit.log({
        userId,
        action: "publish",
        entityType: "page",
        entityId: page.id,
      });
    }
    return page;
  }

  @Post("pages/:id/duplicate")
  async duplicatePage(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    const existingPage = await this.pages.findById(id);
    if (!existingPage) {
      throw new BadRequestException("Page not found.");
    }

    const duplicateSlug = await this.generateUniquePageCopySlug(
      existingPage.slug,
    );
    const duplicatedPage = await this.pages.create({
      slug: duplicateSlug,
      title: this.labelAsCopy(existingPage.title),
      blocks: existingPage.blocks.map(
        (block: (typeof existingPage.blocks)[number]) => ({
          type: block.type,
          data: block.data,
          order: block.order,
        }),
      ),
      seoTitle: existingPage.seoTitle,
      seoDescription: existingPage.seoDescription,
      seoImage: existingPage.seoImage,
      canonicalUrl: existingPage.canonicalUrl,
      noIndex: existingPage.noIndex,
      published: false,
      workflowStatus: "draft",
      publishAt: null,
      unpublishAt: null,
      templateKey: existingPage.templateKey,
    });

    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "page_duplicate",
      entityType: "page",
      entityId: duplicatedPage.id,
      metadata: {
        sourcePageId: existingPage.id,
        sourceSlug: existingPage.slug,
        slug: duplicatedPage.slug,
      },
    });

    return duplicatedPage;
  }

  @Patch("pages/:id")
  async updatePage(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdatePageDto,
  ) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    const existingPage = await this.pages.findById(id);
    if (!existingPage) {
      throw new BadRequestException("Page not found.");
    }

    if (body.templateKey !== undefined && role !== "superadmin") {
      throw new ForbiddenException(
        "Access denied: only superadmin can modify page templates.",
      );
    }

    if (role === "editor") {
      this.ensureEditorCanManagePageUpdate(existingPage, body);
    }

    if (body.blocks) {
      await this.validatePageBlocksMediaAlt(
        body.title ?? existingPage.title,
        body.blocks,
      );
    }

    if (body.slug !== undefined) {
      await this.ensurePageSlugDoesNotConflict(body.slug, id);
    }

    const normalizedBody = this.normalizePublishingWindow(body, existingPage);
    const workflowUpdate = this.resolveWorkflowUpdate(
      role,
      existingPage.workflowStatus,
      existingPage.published,
      body.workflowStatus,
      body.published,
    );
    const userId = await this.getCurrentUserId(req);
    const updated = await this.pages.update(id, {
      ...normalizedBody,
      ...workflowUpdate,
      updatedById: userId,
      revisionNote: body.revisionNote,
    });
    const previousPublished = existingPage.published;
    const nextPublished = updated.published;
    const slugChanged =
      body.slug !== undefined && normalizeSlug(body.slug) !== existingPage.slug;
    this.audit.log({
      userId,
      action: "page_update",
      entityType: "page",
      entityId: id,
      metadata: {
        slug: updated.slug,
        published: updated.published,
      },
    });
    if (slugChanged) {
      this.audit.log({
        userId,
        action: "slug_change",
        entityType: "page",
        entityId: id,
        metadata: { from: existingPage.slug, to: updated.slug },
      });
    }
    if (previousPublished !== nextPublished) {
      this.audit.log({
        userId,
        action: nextPublished ? "publish" : "unpublish",
        entityType: "page",
        entityId: id,
      });
    }
    return updated;
  }

  @Delete("pages/:id")
  async deletePage(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    const page = await this.pages.findById(id);
    await this.pages.delete(id);
    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "page_delete",
      entityType: "page",
      entityId: id,
      metadata: page ? { slug: page.slug } : undefined,
    });
    return { ok: true };
  }

  private ensureEditorCanManagePageUpdate(
    page: Awaited<ReturnType<PagesRepository["findById"]>>,
    body: UpdatePageDto,
  ) {
    if (!page) {
      throw new BadRequestException("Page not found.");
    }

    if (body.slug !== undefined && body.slug !== page.slug) {
      throw new ForbiddenException(
        "Access denied: editors cannot change page slug or route structure.",
      );
    }

    if (body.templateKey !== undefined) {
      throw new ForbiddenException(
        "Access denied: editors cannot modify page templates.",
      );
    }

    if (!body.blocks) {
      return;
    }

    this.ensurePageBlockStructureUnchanged(page.blocks, body.blocks);
  }

  private ensurePageBlockStructureUnchanged(
    existingBlocks: PageBlockPayload[],
    incomingBlocks: PageBlockPayload[],
  ) {
    if (existingBlocks.length !== incomingBlocks.length) {
      throw new ForbiddenException(
        "Access denied: editors cannot add or remove page sections.",
      );
    }

    const sortedExisting = existingBlocks
      .slice()
      .sort((a, b) => a.order - b.order);
    const sortedIncoming = incomingBlocks
      .slice()
      .sort((a, b) => a.order - b.order);

    for (const [index, currentBlock] of sortedIncoming.entries()) {
      const existingBlock = sortedExisting[index];
      if (!existingBlock) {
        throw new ForbiddenException(
          "Access denied: editors cannot alter page section structure.",
        );
      }

      if (
        currentBlock.type !== existingBlock.type ||
        currentBlock.order !== existingBlock.order
      ) {
        throw new ForbiddenException(
          "Access denied: editors cannot reorder or change page section types.",
        );
      }
    }
  }

  @Get("types")
  async listContentTypes(
    @Req() req: Request,
    @Query() query: AdminListQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.contentTypes.findMany(this.buildPagination(query));
  }

  @Get("types/:id")
  async getContentType(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.contentTypes.findById(id);
  }

  @Post("types")
  async createContentType(
    @Req() req: Request,
    @Body() body: CreateContentTypeDto,
  ) {
    await requireSuperAdmin(req, this.auth);
    await this.ensureContentTypeSlugDoesNotConflict(body.slug);
    await this.validateContentTypeFields(body.fields);
    return this.contentTypes.create({
      ...body,
      templateKey: body.templateKey ?? null,
      isPublic: body.isPublic ?? true,
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

    if (body.slug !== undefined) {
      await this.ensureContentTypeSlugDoesNotConflict(body.slug, id);
    }

    return this.contentTypes.update(id, body);
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

  private async ensurePageSlugDoesNotConflict(slug: string, pageId?: string) {
    const conflictingContentType = await this.contentTypes.findBySlug(slug);
    if (conflictingContentType) {
      throw new BadRequestException(
        `Slug '${slug}' conflicts with an existing ContentType slug.`,
      );
    }

    if (!pageId) {
      return;
    }

    const currentPage = await this.pages.findBySlug(slug);
    if (currentPage && currentPage.id !== pageId) {
      throw new BadRequestException(
        `Slug '${slug}' conflicts with another Page slug.`,
      );
    }
  }

  private labelAsCopy(title: string): string {
    const trimmed = title.trim();
    return trimmed ? `${trimmed} (Copy)` : "Untitled copy";
  }

  private buildCopySlug(baseSlug: string, copyNumber?: number): string {
    const suffix = copyNumber === undefined ? "copy" : `copy-${copyNumber}`;
    return `${baseSlug}-${suffix}`;
  }

  private async generateUniquePageCopySlug(baseSlug: string): Promise<string> {
    for (let copyNumber = 1; copyNumber <= 100; copyNumber += 1) {
      const candidate = this.buildCopySlug(
        baseSlug,
        copyNumber === 1 ? undefined : copyNumber,
      );
      const conflictingPage = await this.pages.findBySlug(candidate);
      const conflictingContentType =
        await this.contentTypes.findBySlug(candidate);
      if (!conflictingPage && !conflictingContentType) {
        return candidate;
      }
    }

    throw new ConflictException(
      "Unable to generate a unique slug for duplicated page.",
    );
  }

  private async generateUniqueContentItemCopySlug(
    contentTypeSlug: string,
    baseSlug: string,
  ): Promise<string> {
    for (let copyNumber = 1; copyNumber <= 100; copyNumber += 1) {
      const candidate = this.buildCopySlug(
        baseSlug,
        copyNumber === 1 ? undefined : copyNumber,
      );
      const conflict = await this.contentItems.findBySlug(
        contentTypeSlug,
        candidate,
      );
      if (!conflict) {
        return candidate;
      }
    }

    throw new ConflictException(
      "Unable to generate a unique slug for duplicated content item.",
    );
  }

  private async ensureContentTypeSlugDoesNotConflict(
    slug: string,
    contentTypeId?: string,
  ) {
    const conflictingPage = await this.pages.findBySlug(slug);
    if (conflictingPage) {
      throw new BadRequestException(
        `Slug '${slug}' conflicts with an existing Page slug.`,
      );
    }

    if (!contentTypeId) {
      return;
    }

    const currentContentType = await this.contentTypes.findBySlug(slug);
    if (currentContentType && currentContentType.id !== contentTypeId) {
      throw new BadRequestException(
        `Slug '${slug}' conflicts with another ContentType slug.`,
      );
    }
  }

  @Delete("types/:id")
  async deleteContentType(@Req() req: Request, @Param("id") id: string) {
    await requireSuperAdmin(req, this.auth);
    const contentItemCount = await this.contentItems.countByContentTypeId(id);
    if (contentItemCount > 0) {
      throw new ConflictException(
        `Cannot delete content type with existing content items (${contentItemCount} found).`,
      );
    }

    await this.contentTypes.delete(id);
    return { ok: true };
  }

  @Get("items")
  async listContentItems(
    @Req() req: Request,
    @Query() query: ListContentItemsQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    if (query.mode === "tree") {
      const items = await this.contentItems.findMany(
        this.buildPagination(query),
      );
      return this.toContentItemTree(items);
    }

    return this.contentItems.findMany(this.buildPagination(query));
  }

  @Get("items/:id")
  async getContentItem(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.contentItems.findById(id);
  }

  @Get("items/:id/revisions")
  async listContentItemRevisions(
    @Req() req: Request,
    @Param("id") id: string,
    @Query() query: AdminListQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.contentItems.listRevisions(id, this.buildPagination(query));
  }

  @Get("items/:id/revisions/:revisionId")
  async getContentItemRevision(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("revisionId") revisionId: string,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.contentItems.findRevisionById(id, revisionId);
  }

  @Post("items/:id/revisions/:revisionId/restore")
  async restoreContentItemRevision(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("revisionId") revisionId: string,
    @Body() body: RestoreRevisionDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const userId = await this.getCurrentUserId(req);
    const restored = await this.contentItems.restoreRevision(
      id,
      revisionId,
      userId,
      body.revisionNote,
    );
    this.audit.log({
      userId,
      action: "revision_restore",
      entityType: "content_item",
      entityId: id,
      metadata: { revisionId },
    });
    return restored;
  }

  @Get("items/type/:contentTypeId")
  async listContentItemsByTypeId(
    @Req() req: Request,
    @Param("contentTypeId") contentTypeId: string,
    @Query() query: ListContentItemsQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    if (query.mode === "tree") {
      return this.contentItems.findTreeByContentTypeId(contentTypeId);
    }

    return this.contentItems.findManyByContentTypeId(
      contentTypeId,
      this.buildPagination(query),
    );
  }

  @Get("items/type-slug/:slug")
  async listContentItemsByTypeSlug(
    @Req() req: Request,
    @Param("slug") slug: string,
    @Query() query: ListContentItemsQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    if (query.mode === "tree") {
      const items = await this.contentItems.findTreeByContentTypeSlug(slug);
      return this.filterPublishedContentItemTree(items);
    }

    return this.contentItems.findManyByContentTypeSlug(slug, {
      published: true,
      ...this.buildPagination(query),
    });
  }

  @Get("items/type-slug/:contentTypeSlug/:slug")
  async getContentItemBySlug(
    @Req() req: Request,
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("slug") slug: string,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
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
    const mediaByUrl = new Map<string, { id: string; alt: string }>();
    let cursor: string | undefined;

    while (true) {
      const mediaBatch = await this.media.findMany({
        limit: MAX_LIST_LIMIT,
        cursor,
      });

      if (mediaBatch.length === 0) {
        break;
      }

      for (const item of mediaBatch) {
        mediaByUrl.set(item.url, { id: item.id, alt: item.alt });
      }

      cursor = mediaBatch[mediaBatch.length - 1]?.id;
      if (mediaBatch.length < MAX_LIST_LIMIT || !cursor) {
        break;
      }
    }

    return mediaByUrl;
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

    if (!(await this.mediaUsageService.isMediaUrlUsed(mediaItem.url))) {
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
    const role = await requireMinimumRole(req, this.auth, "editor");
    const contentType = await this.contentTypes.findById(body.contentTypeId);
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    await this.validateContentItemData(contentType.fields, body.data);
    this.ensureEditorCannotModifyRelationFields(
      role,
      contentType.fields,
      body.data,
      null,
    );
    await this.validateContentItemParent(
      body.contentTypeId,
      body.parentId ?? null,
    );
    const normalizedBody = this.normalizePublishingWindow(body);
    const workflowUpdate = this.resolveWorkflowUpdate(
      role,
      undefined,
      undefined,
      body.workflowStatus,
      body.published,
    );
    const item = await this.contentItems.create({
      ...normalizedBody,
      ...workflowUpdate,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      noIndex: body.noIndex ?? false,
    });
    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "content_item_create",
      entityType: "content_item",
      entityId: item.id,
      metadata: {
        slug: item.slug,
        contentTypeId: item.contentTypeId,
        published: item.published,
      },
    });
    if (item.published) {
      this.audit.log({
        userId,
        action: "publish",
        entityType: "content_item",
        entityId: item.id,
      });
    }
    return item;
  }

  @Post("items/:id/duplicate")
  async duplicateContentItem(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
    const existingItem = await this.contentItems.findById(id);
    if (!existingItem) {
      throw new BadRequestException("Content item not found.");
    }

    const contentType = await this.contentTypes.findById(
      existingItem.contentTypeId,
    );
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    const duplicateSlug = await this.generateUniqueContentItemCopySlug(
      contentType.slug,
      existingItem.slug,
    );
    const duplicatedItem = await this.contentItems.create({
      contentTypeId: existingItem.contentTypeId,
      parentId: existingItem.parentId,
      sortOrder: existingItem.sortOrder,
      slug: duplicateSlug,
      title: this.labelAsCopy(existingItem.title),
      seoTitle: existingItem.seoTitle,
      seoDescription: existingItem.seoDescription,
      seoImage: existingItem.seoImage,
      canonicalUrl: existingItem.canonicalUrl,
      noIndex: existingItem.noIndex,
      data: existingItem.data,
      published: false,
      workflowStatus: "draft",
      publishAt: null,
      unpublishAt: null,
    });

    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "content_item_duplicate",
      entityType: "content_item",
      entityId: duplicatedItem.id,
      metadata: {
        sourceItemId: existingItem.id,
        sourceSlug: existingItem.slug,
        slug: duplicatedItem.slug,
        contentTypeId: duplicatedItem.contentTypeId,
      },
    });

    return duplicatedItem;
  }

  @Patch("items/:id")
  async updateContentItem(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateContentItemDto,
  ) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    const existing = await this.contentItems.findById(id);
    if (!existing) {
      throw new BadRequestException("Content item not found.");
    }

    if (role === "editor" && body.slug !== undefined) {
      const normalizedIncomingSlug = normalizeSlug(body.slug);
      if (normalizedIncomingSlug !== existing.slug) {
        throw new ForbiddenException(
          "Access denied: editors cannot change content item slugs.",
        );
      }
    }

    const contentTypeId = body.contentTypeId ?? existing.contentTypeId;
    const contentType = await this.contentTypes.findById(contentTypeId);
    if (!contentType) {
      throw new BadRequestException("Invalid content type.");
    }

    const data = body.data ?? existing.data;
    await this.validateContentItemData(contentType.fields, data);
    this.ensureEditorCannotModifyRelationFields(
      role,
      contentType.fields,
      data,
      existing.data,
    );
    await this.validateContentItemParent(
      contentTypeId,
      body.parentId === undefined ? existing.parentId : body.parentId,
      existing.id,
    );
    const normalizedBody = this.normalizePublishingWindow(body, existing);
    const workflowUpdate = this.resolveWorkflowUpdate(
      role,
      existing.workflowStatus,
      existing.published,
      body.workflowStatus,
      body.published,
    );
    const userId = await this.getCurrentUserId(req);
    const updated = await this.contentItems.update(id, {
      ...normalizedBody,
      ...workflowUpdate,
      updatedById: userId,
      revisionNote: body.revisionNote,
    });
    const slugChanged =
      body.slug !== undefined && normalizeSlug(body.slug) !== existing.slug;
    this.audit.log({
      userId,
      action: "content_item_update",
      entityType: "content_item",
      entityId: id,
      metadata: {
        slug: updated.slug,
        contentTypeId: updated.contentTypeId,
        published: updated.published,
      },
    });
    if (slugChanged) {
      this.audit.log({
        userId,
        action: "slug_change",
        entityType: "content_item",
        entityId: id,
        metadata: { from: existing.slug, to: updated.slug },
      });
    }
    if (existing.published !== updated.published) {
      this.audit.log({
        userId,
        action: updated.published ? "publish" : "unpublish",
        entityType: "content_item",
        entityId: id,
      });
    }
    return updated;
  }

  private parseScheduledDate(
    value: string | null | undefined,
    fieldName: "publishAt" | "unpublishAt",
  ): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date/time.`);
    }

    return parsed;
  }

  private normalizePublishingWindow<
    T extends { publishAt?: string | null; unpublishAt?: string | null },
  >(
    body: T,
    current?: { publishAt: Date | null; unpublishAt: Date | null },
  ): T & { publishAt?: Date | null; unpublishAt?: Date | null } {
    const publishAt = this.parseScheduledDate(body.publishAt, "publishAt");
    const unpublishAt = this.parseScheduledDate(
      body.unpublishAt,
      "unpublishAt",
    );

    const effectivePublishAt =
      publishAt === undefined ? current?.publishAt : publishAt;
    const effectiveUnpublishAt =
      unpublishAt === undefined ? current?.unpublishAt : unpublishAt;

    if (
      effectivePublishAt &&
      effectiveUnpublishAt &&
      effectiveUnpublishAt <= effectivePublishAt
    ) {
      throw new BadRequestException("unpublishAt must be after publishAt.");
    }

    return {
      ...body,
      ...(publishAt === undefined ? {} : { publishAt }),
      ...(unpublishAt === undefined ? {} : { unpublishAt }),
    };
  }

  private resolveWorkflowUpdate(
    role: "editor" | "admin" | "superadmin",
    currentStatus: WorkflowStatus | undefined,
    currentPublished: boolean | undefined,
    requestedStatus: WorkflowStatus | undefined,
    requestedPublished: boolean | undefined,
  ): { workflowStatus: WorkflowStatus; published: boolean } {
    const baseStatus =
      currentStatus ?? (currentPublished ? "published" : "draft");
    const nextStatus =
      requestedStatus ??
      (requestedPublished === undefined
        ? baseStatus
        : requestedPublished
          ? "published"
          : "draft");

    if (
      role === "editor" &&
      nextStatus !== "draft" &&
      nextStatus !== "in_review"
    ) {
      throw new ForbiddenException(
        "Access denied: editors can only save draft or submit for review.",
      );
    }

    const published = nextStatus === "published";

    return { workflowStatus: nextStatus, published };
  }

  private async getCurrentUserId(req: Request): Promise<string | null> {
    const token = readAccessToken(req);
    if (!token) {
      return null;
    }

    try {
      const user = await this.auth.validateUser(token);
      return user.id;
    } catch {
      return null;
    }
  }

  private ensureEditorCannotModifyRelationFields(
    role: "editor" | "admin" | "superadmin",
    fields: Array<ContentFieldDefinition>,
    incomingData: Record<string, unknown>,
    existingData: Record<string, unknown> | null,
  ) {
    if (role !== "editor") {
      return;
    }

    const relationFields = fields.filter(
      (field) =>
        field.type === "relation" ||
        field.type === "contentItem" ||
        field.type === "page",
    );

    for (const field of relationFields) {
      const incoming = incomingData[field.key];
      const current = existingData ? existingData[field.key] : undefined;
      if (
        JSON.stringify(incoming ?? null) !== JSON.stringify(current ?? null)
      ) {
        throw new ForbiddenException(
          "Access denied: editors cannot modify relation fields.",
        );
      }
    }
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
    await requireMinimumRole(req, this.auth, "admin");
    const item = await this.contentItems.findById(id);
    await this.contentItems.delete(id);
    const userId = await this.getCurrentUserId(req);
    this.audit.log({
      userId,
      action: "content_item_delete",
      entityType: "content_item",
      entityId: id,
      metadata: item
        ? { slug: item.slug, contentTypeId: item.contentTypeId }
        : undefined,
    });
    return { ok: true };
  }

  @Get("navigation-items")
  async listNavigationItems(
    @Req() req: Request,
    @Query() query: AdminListQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    return this.navigation.findMany(this.buildPagination(query));
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
  async listSettings(@Req() req: Request, @Query() query: AdminListQueryDto) {
    const role = await requireMinimumRole(req, this.auth, "admin");
    const settings = await this.settings.findMany(this.buildPagination(query));
    if (role === "superadmin") {
      return settings;
    }

    return settings.filter((setting) =>
      this.isAdminEditableSetting(setting.key),
    );
  }

  @Get("settings/:key")
  async getSetting(@Req() req: Request, @Param("key") key: string) {
    const role = await requireMinimumRole(req, this.auth, "admin");
    this.ensureRoleCanManageSetting(role, key);
    return this.settings.findByKey(key);
  }

  @Post("settings")
  async upsertSetting(@Req() req: Request, @Body() body: UpsertSiteSettingDto) {
    const role = await requireMinimumRole(req, this.auth, "admin");
    this.ensureRoleCanManageSetting(role, body.key);
    return this.settings.upsert(body);
  }

  @Delete("settings/:key")
  async deleteSetting(@Req() req: Request, @Param("key") key: string) {
    const role = await requireMinimumRole(req, this.auth, "admin");
    this.ensureRoleCanManageSetting(role, key);
    await this.settings.delete(key);
    return { ok: true };
  }

  private isAdminEditableSetting(key: string): boolean {
    return ADMIN_EDITABLE_SETTING_KEYS.has(key);
  }

  private isProtectedSettingKey(key: string): boolean {
    return PROTECTED_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  private ensureRoleCanManageSetting(
    role: "editor" | "admin" | "superadmin",
    key: string,
  ) {
    if (role === "superadmin") {
      return;
    }

    if (!this.isAdminEditableSetting(key) || this.isProtectedSettingKey(key)) {
      throw new ForbiddenException(
        "Access denied: only superadmin can manage this setting.",
      );
    }
  }

  @Get("media")
  async listMedia(@Req() req: Request, @Query() query: ListMediaQueryDto) {
    await requireMinimumRole(req, this.auth, "editor");
    const mediaItems = await this.media.findMany(this.buildPagination(query));
    const usedUrls = await this.mediaUsageService.getUsedUrls(
      mediaItems.map((item) => item.url),
    );

    return mediaItems.map((item) => ({
      ...item,
      isUsed: usedUrls.has(item.url),
    }));
  }

  @Get("media/:id")
  async getMedia(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "editor");
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
