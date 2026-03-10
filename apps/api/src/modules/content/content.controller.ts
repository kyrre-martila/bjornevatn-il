import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
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
} from "@org/domain";
import { MediaService } from "./media.service";

const PAGE_BLOCK_TYPES = ["hero", "rich_text", "cta", "image", "news_list"] as const;

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
  @IsBoolean()
  published?: boolean;
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

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
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
  getPageBySlug(@Param("slug") slug: string) {
    return this.pages.findBySlug(slug);
  }

  @Post("pages")
  createPage(@Body() body: CreatePageDto) {
    return this.pages.create(body);
  }

  @Patch("pages/:id")
  updatePage(@Param("id") id: string, @Body() body: UpdatePageDto) {
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
  updateContentType(@Param("id") id: string, @Body() body: UpdateContentTypeDto) {
    return this.contentTypes.update(id, body);
  }

  @Delete("types/:id")
  async deleteContentType(@Param("id") id: string) {
    const items = await this.contentItems.findManyByContentTypeId(id);
    if (items.length > 0) {
      throw new ConflictException("Cannot delete content type with existing content items.");
    }

    await this.contentTypes.delete(id);
    return { ok: true };
  }

  @Get("items")
  listContentItems() {
    return this.contentItems.findMany();
  }

  @Get("items/:id")
  getContentItem(@Param("id") id: string) {
    return this.contentItems.findById(id);
  }

  @Get("items/type/:contentTypeId")
  listContentItemsByTypeId(@Param("contentTypeId") contentTypeId: string) {
    return this.contentItems.findManyByContentTypeId(contentTypeId);
  }

  @Get("items/type-slug/:slug")
  async listContentItemsByTypeSlug(@Param("slug") slug: string) {
    const items = await this.contentItems.findManyByContentTypeSlug(slug);
    return items.filter((item) => item.published);
  }

  @Get("items/type-slug/:contentTypeSlug/:slug")
  getContentItemBySlug(
    @Param("contentTypeSlug") contentTypeSlug: string,
    @Param("slug") slug: string,
  ) {
    return this.contentItems.findBySlug(contentTypeSlug, slug);
  }

  @Post("items")
  createContentItem(@Body() body: CreateContentItemDto) {
    return this.contentItems.create(body);
  }

  @Patch("items/:id")
  updateContentItem(@Param("id") id: string, @Body() body: UpdateContentItemDto) {
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
  listMedia() {
    return this.media.findMany();
  }

  @Get("media/:id")
  getMedia(@Param("id") id: string) {
    return this.media.findById(id);
  }

  @Post("media")
  createMedia(@Body() body: CreateMediaDto) {
    return this.media.create({
      ...body,
      mimeType: body.mimeType ?? null,
      sizeBytes: body.sizeBytes ?? null,
      originalFilename: body.originalFilename ?? null,
      storageKey: body.storageKey ?? null,
    });
  }

  @Patch("media/:id")
  updateMedia(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.media.update(id, body);
  }

  @Delete("media/:id")
  async deleteMedia(@Param("id") id: string) {
    await this.mediaService.delete(id);
    return { ok: true };
  }
}
