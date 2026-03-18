import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import {
  ClubhouseBookingStatus,
  OperationalEventSeverity,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import type { Request } from "express";

import { requireMinimumRole } from "../../common/auth/admin-access";
import { verifySubmissionChallenge } from "../../common/auth/submission-challenge";
import { AuthService } from "../auth/auth.service";
import { ClubhouseService } from "./clubhouse.service";
import {
  getActorFromRequest,
  getContextFromRequest,
} from "../observability/observability-request.util";
import { ObservabilityService } from "../observability/observability.service";

@ValidatorConstraint({ name: "isEndAfterStart", async: false })
class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endAtValue: unknown, args: ValidationArguments): boolean {
    const payload = args.object as { startAt?: Date };
    if (!(endAtValue instanceof Date) || Number.isNaN(endAtValue.getTime())) {
      return false;
    }
    if (
      !(payload.startAt instanceof Date) ||
      Number.isNaN(payload.startAt.getTime())
    ) {
      return false;
    }
    return endAtValue.getTime() > payload.startAt.getTime();
  }

  defaultMessage(): string {
    return "endAt must be later than startAt.";
  }
}

class DateRangeDto {
  @ApiProperty({ type: String, format: "date-time" })
  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  @Type(() => Date)
  @IsDate()
  @Validate(IsEndAfterStartConstraint)
  endAt!: Date;
}

class CreateClubhouseBookingDto extends DateRangeDto {
  @ApiProperty()
  @IsString()
  bookedByName!: string;

  @ApiProperty()
  @IsEmail()
  bookedByEmail!: string;

  @ApiProperty()
  @IsString()
  bookedByPhone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty()
  @IsString()
  purpose!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  challengeToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  attendeeCount?: number;
}

class ClubhouseBookingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookedByName!: string;

  @ApiProperty()
  bookedByEmail!: string;

  @ApiProperty()
  bookedByPhone!: string;

  @ApiProperty({ required: false })
  organization?: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ required: false })
  attendeeCount?: number;

  @ApiProperty({ enum: ["pending", "approved", "rejected", "cancelled"] })
  status!: "pending" | "approved" | "rejected" | "cancelled";

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty({ type: String, format: "date-time" })
  startAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  endAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: string;
}

class ListBookingsQueryDto {
  @ApiProperty({
    required: false,
    enum: ["pending", "approved", "rejected", "cancelled"],
  })
  @IsOptional()
  @IsIn(["pending", "approved", "rejected", "cancelled"])
  status?: "pending" | "approved" | "rejected" | "cancelled";

  @ApiProperty({ required: false, enum: ["upcoming", "past", "all"] })
  @IsOptional()
  @IsIn(["upcoming", "past", "all"])
  timeframe?: "upcoming" | "past" | "all";

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class UpdateAdminNotesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

class CreateBlockedPeriodDto extends DateRangeDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

function toBookingDto(booking: {
  id: string;
  bookedByName: string;
  bookedByEmail: string;
  bookedByPhone: string;
  organization: string | null;
  purpose: string;
  attendeeCount: number | null;
  status: ClubhouseBookingStatus;
  adminNotes: string | null;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ClubhouseBookingDto {
  return {
    ...booking,
    organization: booking.organization ?? undefined,
    attendeeCount: booking.attendeeCount ?? undefined,
    adminNotes: booking.adminNotes ?? undefined,
    status: booking.status,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

@ApiTags("clubhouse")
@Controller("clubhouse")
export class ClubhouseController {
  constructor(
    private readonly clubhouseService: ClubhouseService,
    private readonly auth: AuthService,
    private readonly observability: ObservabilityService,
  ) {}

  @Post("bookings")
  async createBooking(
    @Req() req: Request,
    @Body() body: CreateClubhouseBookingDto,
  ): Promise<{ id: string; status: string; createdAt: string }> {
    const context = getContextFromRequest(req, "clubhouse");

    try {
      verifySubmissionChallenge(body.challengeToken);
    } catch (error) {
      await this.observability.logEvent({
        eventType: "challenge_verification_failed",
        severity: OperationalEventSeverity.warn,
        context,
        metadata: {
          endpointCategory: "clubhouse_booking",
          submissionType: "clubhouse_booking",
          reason:
            error instanceof Error
              ? error.message
              : "Submission challenge failed",
        },
      });
      throw error;
    }

    try {
      const booking = await this.observability.timeOperation(
        {
          flow: "clubhouse_booking_submission",
          actor: { type: "public" },
          context,
          metadata: { submissionType: "clubhouse_booking" },
        },
        () => this.clubhouseService.createBooking(body),
      );

      await this.observability.logEvent({
        eventType: "public_submission_succeeded",
        severity: OperationalEventSeverity.info,
        actor: { type: "public" },
        context,
        metadata: {
          submissionType: "clubhouse_booking",
          bookingId: booking.id,
        },
      });

      return {
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      };
    } catch (error) {
      await this.observability.logEvent({
        eventType: "public_submission_failed",
        severity: OperationalEventSeverity.warn,
        actor: { type: "public" },
        context,
        metadata: {
          submissionType: "clubhouse_booking",
          reason:
            error instanceof Error
              ? error.message
              : "Booking submission failed",
        },
      });
      throw error;
    }
  }

  @Get("admin/bookings")
  async listBookings(
    @Req() req: Request,
    @Query() query: ListBookingsQueryDto,
  ): Promise<{
    items: ClubhouseBookingDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    filters: { status: string | null; timeframe: string | null };
  }> {
    await requireMinimumRole(req, this.auth, "admin");

    const bookings = await this.observability.timeOperation(
      {
        flow: "admin_clubhouse_bookings_list",
        actor: getActorFromRequest(req),
        context: getContextFromRequest(req, "clubhouse"),
        metadata: {
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 25,
          status: query.status ?? null,
          timeframe: query.timeframe ?? null,
        },
        slowThresholdMs: 750,
      },
      () =>
        this.clubhouseService.listBookings({
          status: query.status,
          timeframe:
            query.timeframe && query.timeframe !== "all"
              ? query.timeframe
              : undefined,
          page: query.page,
          pageSize: query.pageSize,
        }),
    );

    return {
      ...bookings,
      items: bookings.items.map(toBookingDto),
    };
  }

  @Get("admin/bookings/:id")
  async getBooking(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ClubhouseBookingDto> {
    await requireMinimumRole(req, this.auth, "admin");
    const booking = await this.clubhouseService.getBookingById(id);
    return toBookingDto(booking);
  }

  @Patch("admin/bookings/:id/admin-notes")
  async updateAdminNotes(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateAdminNotesDto,
  ): Promise<ClubhouseBookingDto> {
    await requireMinimumRole(req, this.auth, "admin");
    const booking = await this.clubhouseService.updateBookingAdminNotes(
      id,
      body.adminNotes ?? null,
    );
    return toBookingDto(booking);
  }

  @Post("admin/bookings/:id/approve")
  async approveBooking(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ClubhouseBookingDto> {
    await requireMinimumRole(req, this.auth, "admin");
    const booking = await this.clubhouseService.changeBookingStatus(
      id,
      ClubhouseBookingStatus.approved,
    );
    return toBookingDto(booking);
  }

  @Post("admin/bookings/:id/reject")
  async rejectBooking(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ClubhouseBookingDto> {
    await requireMinimumRole(req, this.auth, "admin");
    const booking = await this.clubhouseService.changeBookingStatus(
      id,
      ClubhouseBookingStatus.rejected,
    );
    return toBookingDto(booking);
  }

  @Post("admin/bookings/:id/cancel")
  async cancelBooking(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<ClubhouseBookingDto> {
    await requireMinimumRole(req, this.auth, "admin");
    const booking = await this.clubhouseService.changeBookingStatus(
      id,
      ClubhouseBookingStatus.cancelled,
    );
    return toBookingDto(booking);
  }

  @Get("admin/blocked-periods")
  async listBlockedPeriods(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    const blocked = await this.clubhouseService.listBlockedPeriods();
    return blocked.map((item) => ({
      ...item,
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  @Post("admin/blocked-periods")
  async createBlockedPeriod(
    @Req() req: Request,
    @Body() body: CreateBlockedPeriodDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const blocked = await this.clubhouseService.createBlockedPeriod(body);
    return {
      ...blocked,
      startAt: blocked.startAt.toISOString(),
      endAt: blocked.endAt.toISOString(),
      createdAt: blocked.createdAt.toISOString(),
      updatedAt: blocked.updatedAt.toISOString(),
    };
  }

  @Patch("admin/blocked-periods/:id")
  async updateBlockedPeriod(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: CreateBlockedPeriodDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    const blocked = await this.clubhouseService.updateBlockedPeriod(id, body);
    return {
      ...blocked,
      startAt: blocked.startAt.toISOString(),
      endAt: blocked.endAt.toISOString(),
      createdAt: blocked.createdAt.toISOString(),
      updatedAt: blocked.updatedAt.toISOString(),
    };
  }

  @Delete("admin/blocked-periods/:id")
  async deleteBlockedPeriod(
    @Req() req: Request,
    @Param("id") id: string,
  ): Promise<{ ok: true }> {
    await requireMinimumRole(req, this.auth, "admin");
    await this.clubhouseService.deleteBlockedPeriod(id);
    return { ok: true };
  }
}
