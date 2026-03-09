import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiProperty, ApiTags } from "@nestjs/swagger";
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
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  MediaRepository,
  NavigationItemsRepository,
  PagesRepository,
  PostsRepository,
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

class CreatePostDto {
  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  excerpt!: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  featuredImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publishedAt?: string;
}

class UpdatePostDto {
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
  excerpt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  featuredImage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publishedAt?: string;
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
}



class UploadMediaDto {
  @ApiProperty()
  @IsString()
  alt!: string;
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
}

@ApiTags("content")
@Controller("content")
export class ContentController {
  constructor(
    @Inject("PagesRepository")
    private readonly pages: PagesRepository,
    @Inject("PostsRepository")
    private readonly posts: PostsRepository,
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

  @Get("posts")
  listPosts() {
    return this.posts.findMany();
  }

  @Get("posts/:id")
  getPost(@Param("id") id: string) {
    return this.posts.findById(id);
  }

  @Get("posts/slug/:slug")
  getPostBySlug(@Param("slug") slug: string) {
    return this.posts.findBySlug(slug);
  }

  @Get("posts/published/listing")
  async listPublishedPosts() {
    const posts = await this.posts.findMany();
    return posts
      .filter((post) => Boolean(post.publishedAt))
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  }

  @Post("posts")
  createPost(@Body() body: CreatePostDto) {
    return this.posts.create({
      ...body,
      featuredImage: body.featuredImage ?? null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
    });
  }

  @Patch("posts/:id")
  updatePost(@Param("id") id: string, @Body() body: UpdatePostDto) {
    return this.posts.update(id, {
      ...body,
      featuredImage: body.featuredImage,
      publishedAt:
        body.publishedAt === undefined ? undefined : new Date(body.publishedAt),
    });
  }

  @Delete("posts/:id")
  async deletePost(@Param("id") id: string) {
    await this.posts.delete(id);
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


  @Post("media/upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        alt: { type: "string" },
      },
      required: ["file", "alt"],
    },
  })
  async uploadMedia(
    @UploadedFile() file:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
    @Body() body: UploadMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.mediaService.upload({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      alt: body.alt,
    });
  }

  @Post("media")
  createMedia(@Body() body: CreateMediaDto) {
    return this.media.create(body);
  }

  @Patch("media/:id")
  updateMedia(@Param("id") id: string, @Body() body: UpdateMediaDto) {
    return this.media.update(id, body);
  }

  @Delete("media/:id")
  async deleteMedia(@Param("id") id: string) {
    await this.media.delete(id);
    return { ok: true };
  }
}
