import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { MembershipApplicationStatus } from "@prisma/client";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { verifySubmissionChallenge } from "../../common/auth/submission-challenge";
import { AuthService } from "../auth/auth.service";
import { MembershipService } from "./membership.service";

const STATUS_VALUES: MembershipApplicationStatus[] = ["new", "contacted", "approved", "rejected", "archived"];

class CreateMembershipApplicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, type: String, format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  guardianEmail?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  membershipCategoryId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  challengeToken?: string;
}

class MembershipApplicationsQueryDto {
  @ApiProperty({ required: false, enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: MembershipApplicationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  membershipCategoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class UpdateMembershipApplicationDto {
  @ApiProperty({ required: false, enum: STATUS_VALUES })
  @IsOptional()
  @IsIn(STATUS_VALUES)
  status?: MembershipApplicationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

function isMinor(dateOfBirth: Date): boolean {
  const now = new Date();
  const adult = new Date(dateOfBirth);
  adult.setFullYear(adult.getFullYear() + 18);
  return adult > now;
}

@ApiTags("membership")
@Controller("membership")
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly auth: AuthService,
  ) {}

  @Get("settings")
  async getSettings() {
    return this.membershipService.getSettings();
  }

  @Get("categories")
  async listCategories() {
    return this.membershipService.listActiveCategories();
  }

  @Post("applications")
  async createApplication(@Body() body: CreateMembershipApplicationDto) {
    verifySubmissionChallenge(body.challengeToken);
    if (body.dateOfBirth && isMinor(body.dateOfBirth)) {
      if (!body.guardianName || !body.guardianPhone || !body.guardianEmail) {
        throw new BadRequestException("Guardian name, phone, and email are required for minors.");
      }
    }

    const created = await this.membershipService.createApplication(body);
    return { id: created.id, status: created.status, createdAt: created.createdAt.toISOString() };
  }

  @Get("admin/applications")
  async listApplications(@Req() req: Request, @Query() query: MembershipApplicationsQueryDto) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.membershipService.listApplications(query);
  }

  @Get("admin/applications/:id")
  async getApplication(@Req() req: Request, @Param("id") id: string) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.membershipService.getApplication(id);
  }

  @Get("admin/categories")
  async listAdminCategories(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.membershipService.listCategories();
  }

  @Patch("admin/applications/:id")
  async updateApplication(@Req() req: Request, @Param("id") id: string, @Body() body: UpdateMembershipApplicationDto) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.membershipService.updateApplication(id, {
      status: body.status,
      adminNotes: body.adminNotes,
    });
  }
}
