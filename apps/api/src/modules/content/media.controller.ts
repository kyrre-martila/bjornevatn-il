import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { FileInterceptor } from "@nestjs/platform-express";
import { MediaService } from "./media.service";
import { MediaUsageService } from "./media-usage.service";
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

class ListMediaQueryDto {
  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
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
    private readonly mediaUsageService: MediaUsageService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async listMedia(@Req() req: Request, @Query() query: ListMediaQueryDto) {
    await requireMinimumRole(req, this.auth, "editor");
    const media = await this.mediaService.list({
      offset: query.offset,
      limit: query.limit,
    });
    const usedUrls = await this.mediaUsageService.getUsedUrls(
      media.map((item) => item.url),
    );

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
    await requireMinimumRole(req, this.auth, "editor");

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
    await requireMinimumRole(req, this.auth, "editor");
    await this.mediaService.delete(id);
    return { ok: true };
  }

  @Patch(":id")
  async updateMedia(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateMediaDto,
  ) {
    await requireMinimumRole(req, this.auth, "editor");
    const nextAlt = body.alt === undefined ? undefined : body.alt.trim();

    if (nextAlt !== undefined && !nextAlt) {
      const existing = await this.mediaService.findById(id);
      if (!existing) {
        throw new BadRequestException("Media item not found.");
      }

      if (await this.mediaUsageService.isMediaUrlUsed(existing.url)) {
        throw new BadRequestException(
          "Alt text is required for media used in page blocks or content items.",
        );
      }
    }

    return this.mediaService.update(id, { alt: nextAlt });
  }

}
