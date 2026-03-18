import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import type { Request } from "express";
import { requireMinimumRole } from "../../common/auth/admin-access";
import { AuthService } from "../auth/auth.service";
import {
  type ObservabilityRange,
  ObservabilityService,
} from "./observability.service";

const OBSERVABILITY_RANGES = ["today", "last7Days", "last30Days"] as const;

class ObservabilityDashboardQueryDto {
  @ApiProperty({
    required: false,
    enum: OBSERVABILITY_RANGES,
    default: "last7Days",
  })
  @IsOptional()
  @IsIn(OBSERVABILITY_RANGES)
  range?: ObservabilityRange;
}

@ApiTags("admin-observability")
@Controller("admin/observability")
export class ObservabilityController {
  constructor(
    private readonly auth: AuthService,
    private readonly observability: ObservabilityService,
  ) {}

  @Get()
  async getDashboard(
    @Req() req: Request,
    @Query() query: ObservabilityDashboardQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.observability.getDashboard(query.range ?? "last7Days");
  }
}
