import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { MatchSyncImportMode, MatchSyncSourceType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import type { Request } from "express";
import { requireMinimumRole } from "../../common/auth/admin-access";
import { AuthService } from "../auth/auth.service";
import { MATCH_EXTERNAL_SOURCES } from "./matches-sync.types";
import { MatchesSyncService } from "./matches-sync.service";
import {
  getActorFromRequest,
  getContextFromRequest,
} from "../observability/observability-request.util";
import { ObservabilityService } from "../observability/observability.service";

class UpdateFotballNoSettingsDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  clubName?: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString({ each: true })
  teamIds?: string[];

  @IsIn(["fotball_no", "ical"])
  sourceType!: MatchSyncSourceType;

  @IsIn(["create_only", "create_and_update"])
  importMode!: MatchSyncImportMode;

  @IsBoolean()
  autoSyncEnabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  syncIntervalMinutes!: number;
}

@ApiTags("matches")
@Controller("matches/admin")
export class MatchesSyncController {
  constructor(
    private readonly service: MatchesSyncService,
    private readonly auth: AuthService,
    private readonly observability: ObservabilityService,
  ) {}

  @Get("settings")
  async getSettings(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.service.getSettings();
  }

  @Post("settings")
  async updateSettings(
    @Req() req: Request,
    @Body() body: UpdateFotballNoSettingsDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.service.updateSettings(body);
  }

  @Post("sync")
  async runSync(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.service.runSync({
      actor: getActorFromRequest(req),
      context: getContextFromRequest(req, "matches-sync"),
    });
  }

  @Get()
  async listMatches(
    @Req() req: Request,
    @Query("source") source?: string,
    @Query("upcoming") upcoming?: string,
    @Query("ticketSalesEnabled") ticketSalesEnabled?: string,
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const page = Number(pageRaw);
    const pageSize = Number(pageSizeRaw);

    return this.observability.timeOperation(
      {
        flow: "admin_matches_list",
        actor: getActorFromRequest(req),
        context: getContextFromRequest(req, "matches-sync"),
        metadata: {
          source: source ?? null,
          upcoming: upcoming ?? null,
          ticketSalesEnabled: ticketSalesEnabled ?? null,
          page: Number.isFinite(page) && page > 0 ? page : 1,
          pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
        },
        slowThresholdMs: 750,
      },
      () =>
        this.service.listMatches({
          source: MATCH_EXTERNAL_SOURCES.includes(source as never)
            ? source
            : undefined,
          upcoming:
            upcoming === "upcoming"
              ? true
              : upcoming === "past"
                ? false
                : undefined,
          ticketSalesEnabled:
            ticketSalesEnabled === "true"
              ? true
              : ticketSalesEnabled === "false"
                ? false
                : undefined,
          page: Number.isFinite(page) && page > 0 ? page : undefined,
          pageSize:
            Number.isFinite(pageSize) && pageSize > 0 ? pageSize : undefined,
        }),
    );
  }
}
