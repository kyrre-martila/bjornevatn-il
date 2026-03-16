import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiProperty, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { AuthService } from "../auth/auth.service";
import { AuditService } from "./audit.service";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

class ListAuditLogsQueryDto {
  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entityType?: string;

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

class AuditLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty({ nullable: true })
  entityId!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  metadata!: unknown;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ nullable: true, type: Object })
  user!: { id: string; email: string; name: string | null } | null;
}

@ApiTags("audit")
@Controller("admin/audit-logs")
export class AuditController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiQuery({ name: "userId", required: false, type: String })
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "entityType", required: false, type: String })
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
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<AuditLogDto[]> {
    await requireMinimumRole(req, this.auth, "admin");

    const items = await this.audit.list(query);
    return items.map((item) => ({
      id: item.id,
      userId: item.userId,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
      user: item.user
        ? {
            id: item.user.id,
            email: item.user.email,
            name: item.user.name ?? item.user.displayName,
          }
        : null,
    }));
  }
}
