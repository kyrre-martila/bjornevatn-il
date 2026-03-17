import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ClubhouseBookingStatus, type Prisma } from "@prisma/client";

export type CreateClubhouseBookingInput = {
  bookedByName: string;
  bookedByEmail: string;
  bookedByPhone: string;
  organization?: string;
  purpose: string;
  attendeeCount?: number;
  startAt: Date;
  endAt: Date;
};

@Injectable()
export class ClubhouseService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureAvailability(startAt: Date, endAt: Date): Promise<void> {
    const overlapWhere: Prisma.ClubhouseBookingWhereInput = {
      status: ClubhouseBookingStatus.approved,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    };

    const [approvedOverlapCount, blockedOverlapCount] = await Promise.all([
      this.prisma.clubhouseBooking.count({ where: overlapWhere }),
      this.prisma.clubhouseBlockedPeriod.count({
        where: {
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      }),
    ]);

    if (approvedOverlapCount > 0 || blockedOverlapCount > 0) {
      throw new BadRequestException(
        "The selected time range is unavailable because it overlaps an existing booking or blocked period.",
      );
    }
  }

  async createBooking(input: CreateClubhouseBookingInput) {
    await this.ensureAvailability(input.startAt, input.endAt);

    return this.prisma.clubhouseBooking.create({
      data: {
        ...input,
        status: ClubhouseBookingStatus.pending,
      },
    });
  }
}
