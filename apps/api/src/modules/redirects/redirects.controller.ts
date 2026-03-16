import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Redirect, RedirectsRepository } from "@org/domain";
import { ApiProperty, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { readAccessToken } from "../../common/auth/read-access-token";
import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

class ListRedirectsQueryDto {
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

class RedirectDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fromPath!: string;

  @ApiProperty()
  toPath!: string;

  @ApiProperty({ enum: [301, 302] })
  statusCode!: 301 | 302;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;
}

class CreateRedirectDto {
  @ApiProperty()
  @IsString()
  fromPath!: string;

  @ApiProperty()
  @IsString()
  toPath!: string;

  @ApiProperty({ enum: [301, 302] })
  @IsIn([301, 302])
  statusCode!: 301 | 302;
}

class UpdateRedirectDto {
  @ApiProperty()
  @IsString()
  fromPath!: string;

  @ApiProperty()
  @IsString()
  toPath!: string;

  @ApiProperty({ enum: [301, 302] })
  @IsIn([301, 302])
  statusCode!: 301 | 302;
}

function normalizePath(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) {
    throw new BadRequestException(`${fieldName} must start with '/'.`);
  }

  if (trimmed.includes("://")) {
    throw new BadRequestException(`${fieldName} must be an internal path.`);
  }

  return trimmed;
}

function toDto(redirect: Redirect): RedirectDto {
  return {
    id: redirect.id,
    fromPath: redirect.fromPath,
    toPath: redirect.toPath,
    statusCode: redirect.statusCode as 301 | 302,
    createdAt: redirect.createdAt.toISOString(),
    updatedAt: redirect.updatedAt.toISOString(),
  };
}

@ApiTags("redirects")
@Controller("admin/redirects")
export class RedirectsController {
  constructor(
    @Inject("RedirectsRepository")
    private readonly redirects: RedirectsRepository,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    schema: { minimum: 0 },
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    schema: {
      minimum: 1,
      maximum: MAX_LIST_LIMIT,
      default: DEFAULT_LIST_LIMIT,
    },
  })
  @ApiQuery({ name: "cursor", required: false, type: String })
  async list(
    @Req() req: Request,
    @Query() query: ListRedirectsQueryDto,
  ): Promise<RedirectDto[]> {
    await requireMinimumRole(req, this.auth, "admin");

    const limit =
      typeof query.limit === "number"
        ? Math.min(MAX_LIST_LIMIT, Math.max(1, query.limit))
        : DEFAULT_LIST_LIMIT;

    const redirects = await this.redirects.findMany({
      offset: query.offset,
      cursor: query.cursor,
      limit,
    });

    return redirects.map(toDto);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Body() body: CreateRedirectDto,
  ): Promise<RedirectDto> {
    await requireMinimumRole(req, this.auth, "admin");

    const fromPath = normalizePath(body.fromPath, "fromPath");
    const toPath = normalizePath(body.toPath, "toPath");

    const created = await this.redirects.create({
      fromPath,
      toPath,
      statusCode: body.statusCode,
    });

    const userId = await this.getCurrentUserId(req);

    this.audit.log({
      userId,
      action: "redirect_create",
      entityType: "redirect",
      entityId: created.id,
      metadata: {
        actor: {
          userId,
        },
        after: {
          fromPath: created.fromPath,
          toPath: created.toPath,
          statusCode: created.statusCode,
        },
      },
    });

    return toDto(created);
  }

  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateRedirectDto,
  ): Promise<RedirectDto> {
    await requireMinimumRole(req, this.auth, "admin");

    const fromPath = normalizePath(body.fromPath, "fromPath");
    const toPath = normalizePath(body.toPath, "toPath");

    const existing = await this.redirects.findById(id);

    const updated = await this.redirects.update(id, {
      fromPath,
      toPath,
      statusCode: body.statusCode,
    });

    const userId = await this.getCurrentUserId(req);

    this.audit.log({
      userId,
      action: "redirect_update",
      entityType: "redirect",
      entityId: updated.id,
      metadata: {
        actor: {
          userId,
        },
        before: existing
          ? {
              fromPath: existing.fromPath,
              toPath: existing.toPath,
              statusCode: existing.statusCode,
            }
          : null,
        after: {
          fromPath: updated.fromPath,
          toPath: updated.toPath,
          statusCode: updated.statusCode,
        },
      },
    });

    return toDto(updated);
  }

  @Delete(":id")
  async remove(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    await requireMinimumRole(req, this.auth, "admin");

    const existing = await this.redirects.findById(id);
    await this.redirects.delete(id);

    const userId = await this.getCurrentUserId(req);

    this.audit.log({
      userId,
      action: "redirect_delete",
      entityType: "redirect",
      entityId: id,
      metadata: {
        actor: {
          userId,
        },
        before: existing
          ? {
              fromPath: existing.fromPath,
              toPath: existing.toPath,
              statusCode: existing.statusCode,
            }
          : null,
      },
    });

    return { ok: true };
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
}
