import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";

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

function toDto(redirect: {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: Date;
  updatedAt: Date;
}): RedirectDto {
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
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async list(@Req() req: Request): Promise<RedirectDto[]> {
    await requireMinimumRole(req, this.auth, "admin");

    const redirects = await this.prisma.redirectRule.findMany({
      orderBy: { fromPath: "asc" },
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

    const created = await this.prisma.redirectRule.create({
      data: {
        fromPath,
        toPath,
        statusCode: body.statusCode,
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

    const updated = await this.prisma.redirectRule.update({
      where: { id },
      data: {
        fromPath,
        toPath,
        statusCode: body.statusCode,
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

    await this.prisma.redirectRule.delete({ where: { id } });
    return { ok: true };
  }
}
