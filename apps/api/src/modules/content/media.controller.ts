import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { FileInterceptor } from "@nestjs/platform-express";
import type {
  ContentItemsRepository,
  ContentTypesRepository,
  PagesRepository,
} from "@org/domain";
import { MediaService } from "./media.service";
import { AuthService } from "../auth/auth.service";
import { requireMinimumRole } from "../../common/auth/admin-access";
import type { Request } from "express";

const MEDIA_UPLOAD_LIMITS = {
  fileSizeBytes: 10 * 1024 * 1024,
  files: 1,
} as const;

class UploadMediaDto {
  @ApiProperty()
  @IsString()
  alt!: string;
}

class UpdateMediaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alt?: string;
}

@ApiTags("admin-media")
@Controller("admin/media")
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    @Inject("PagesRepository")
    private readonly pages: PagesRepository,
    @Inject("ContentTypesRepository")
    private readonly contentTypes: ContentTypesRepository,
    @Inject("ContentItemsRepository")
    private readonly contentItems: ContentItemsRepository,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async listMedia(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "editor");
    const [media, usedUrls] = await Promise.all([
      this.mediaService.list(),
      this.getUsedMediaUrls(),
    ]);

    return media.map((item) => ({
      ...item,
      isUsed: usedUrls.has(item.url),
    }));
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: MEDIA_UPLOAD_LIMITS.fileSizeBytes,
        files: MEDIA_UPLOAD_LIMITS.files,
      },
    }),
  )
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
    @Req() req: Request,
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype: string }
      | undefined,
    @Body() body: UploadMediaDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");

    if (!file) {
      throw new BadRequestException("File is required");
    }

    const alt = body.alt.trim();
    if (!alt) {
      throw new BadRequestException("Alt text is required.");
    }

    return this.mediaService.upload({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      alt,
    });
  }

  @Delete(":id")
  async deleteMedia(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    await this.mediaService.delete(id);
    return { ok: true };
  }

  @Patch(":id")
  async updateMedia(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateMediaDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const nextAlt = body.alt === undefined ? undefined : body.alt.trim();

    if (nextAlt !== undefined && !nextAlt) {
      const media = await this.mediaService.list();
      const existing = media.find((entry) => entry.id === id);
      if (!existing) {
        throw new BadRequestException("Media item not found.");
      }

      const usedUrls = await this.getUsedMediaUrls();
      if (usedUrls.has(existing.url)) {
        throw new BadRequestException(
          "Alt text is required for media used in page blocks or content items.",
        );
      }
    }

    return this.mediaService.update(id, { alt: nextAlt });
  }

  private async getUsedMediaUrls(): Promise<Set<string>> {
    const urls = new Set<string>();

    const pages = await this.pages.findMany();
    for (const page of pages) {
      for (const block of page.blocks) {
        if (block.type === "image") {
          const src = block.data.src;
          if (typeof src === "string" && src.trim()) {
            urls.add(src.trim());
          }
        }

        if (block.type === "hero") {
          const imageUrl = block.data.imageUrl;
          if (typeof imageUrl === "string" && imageUrl.trim()) {
            urls.add(imageUrl.trim());
          }
        }
      }
    }

    const contentTypes = await this.contentTypes.findMany();
    for (const contentType of contentTypes) {
      const imageFields = contentType.fields.filter(
        (field: { type: string }) => field.type === "image",
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
          if (typeof value === "string" && value.trim()) {
            urls.add(value.trim());
          }
        }
      }
    }

    return urls;
  }
}
