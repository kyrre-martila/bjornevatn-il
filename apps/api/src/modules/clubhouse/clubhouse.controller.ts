import { Body, Controller, Post } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
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
import { ClubhouseService } from "./clubhouse.service";

@ValidatorConstraint({ name: "isEndAfterStart", async: false })
class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endAtValue: unknown, args: ValidationArguments): boolean {
    const payload = args.object as { startAt?: Date };
    if (!(endAtValue instanceof Date) || Number.isNaN(endAtValue.getTime())) {
      return false;
    }
    if (!(payload.startAt instanceof Date) || Number.isNaN(payload.startAt.getTime())) {
      return false;
    }
    return endAtValue.getTime() > payload.startAt.getTime();
  }

  defaultMessage(): string {
    return "endAt must be later than startAt.";
  }
}

class CreateClubhouseBookingDto {
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  attendeeCount?: number;

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

class ClubhouseBookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["pending", "approved", "rejected", "cancelled"] })
  status!: "pending" | "approved" | "rejected" | "cancelled";

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;
}

@ApiTags("clubhouse")
@Controller("clubhouse")
export class ClubhouseController {
  constructor(private readonly clubhouseService: ClubhouseService) {}

  @Post("bookings")
  async createBooking(
    @Body() body: CreateClubhouseBookingDto,
  ): Promise<ClubhouseBookingResponseDto> {
    const booking = await this.clubhouseService.createBooking(body);
    return {
      id: booking.id,
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
    };
  }
}
