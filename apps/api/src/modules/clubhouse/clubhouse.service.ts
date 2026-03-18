import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ClubhouseBookingStatus, type Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

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

type EnsureNoConflictInput = {
  startAt: Date;
  endAt: Date;
  excludeBookingId?: string;
  excludeBlockedPeriodId?: string;
};

@Injectable()
export class ClubhouseService {
  constructor(private readonly prisma: PrismaService) {}

  private assertValidRange(startAt: Date, endAt: Date): void {
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException("endAt must be later than startAt.");
    }
  }

  async ensureNoConflicts({
    startAt,
    endAt,
    excludeBookingId,
    excludeBlockedPeriodId,
  }: EnsureNoConflictInput): Promise<void> {
    this.assertValidRange(startAt, endAt);

    const bookingWhere: Prisma.ClubhouseBookingWhereInput = {
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: ClubhouseBookingStatus.approved,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    };

    const blockedWhere: Prisma.ClubhouseBlockedPeriodWhereInput = {
      id: excludeBlockedPeriodId ? { not: excludeBlockedPeriodId } : undefined,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    };

    const [bookingConflict, blockedConflict] = await Promise.all([
      this.prisma.clubhouseBooking.findFirst({
        where: bookingWhere,
        select: { id: true, startAt: true, endAt: true },
      }),
      this.prisma.clubhouseBlockedPeriod.findFirst({
        where: blockedWhere,
        select: { id: true, startAt: true, endAt: true, reason: true },
      }),
    ]);

    if (bookingConflict) {
      throw new BadRequestException(
        `Conflict with approved booking ${bookingConflict.id} (${bookingConflict.startAt.toISOString()} - ${bookingConflict.endAt.toISOString()}).`,
      );
    }

    if (blockedConflict) {
      throw new BadRequestException(
        `Conflict with blocked period ${blockedConflict.id} (${blockedConflict.startAt.toISOString()} - ${blockedConflict.endAt.toISOString()})${blockedConflict.reason ? `: ${blockedConflict.reason}` : ""}.`,
      );
    }
  }

  async createBooking(input: CreateClubhouseBookingInput) {
    this.assertValidRange(input.startAt, input.endAt);

    return this.prisma.clubhouseBooking.create({
      data: {
        ...input,
        status: ClubhouseBookingStatus.pending,
      },
    });
  }

  async listBookings(filters: {
    status?: ClubhouseBookingStatus;
    timeframe?: "upcoming" | "past";
    page?: number;
    pageSize?: number;
  }) {
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
    const page = Math.max(1, filters.page ?? 1);
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where = {
        status: filters.status,
        ...(filters.timeframe === "upcoming"
          ? { endAt: { gte: now } }
          : filters.timeframe === "past"
            ? { endAt: { lt: now } }
            : {}),
      };

    const [items, total] = await Promise.all([
      this.prisma.clubhouseBooking.findMany({
      where,
      orderBy: { startAt: "asc" },
      skip,
      take: pageSize,
    }),
      this.prisma.clubhouseBooking.count({ where }),
    ]);

    return {
      items,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      filters: { status: filters.status ?? null, timeframe: filters.timeframe ?? null },
    };
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.clubhouseBooking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    return booking;
  }

  async updateBookingAdminNotes(id: string, adminNotes: string | null) {
    await this.getBookingById(id);

    return this.prisma.clubhouseBooking.update({
      where: { id },
      data: {
        adminNotes: adminNotes?.trim() || null,
      },
    });
  }

  async changeBookingStatus(id: string, status: ClubhouseBookingStatus) {
    const booking = await this.getBookingById(id);

    if (status === ClubhouseBookingStatus.approved) {
      await this.ensureNoConflicts({
        startAt: booking.startAt,
        endAt: booking.endAt,
        excludeBookingId: booking.id,
      });
    }

    return this.prisma.clubhouseBooking.update({
      where: { id },
      data: { status },
    });
  }

  async listBlockedPeriods() {
    return this.prisma.clubhouseBlockedPeriod.findMany({
      orderBy: { startAt: "asc" },
    });
  }

  async createBlockedPeriod(input: { startAt: Date; endAt: Date; reason: string }) {
    await this.ensureNoConflicts({ startAt: input.startAt, endAt: input.endAt });

    return this.prisma.clubhouseBlockedPeriod.create({
      data: {
        startAt: input.startAt,
        endAt: input.endAt,
        reason: input.reason.trim(),
      },
    });
  }

  async updateBlockedPeriod(
    id: string,
    input: { startAt: Date; endAt: Date; reason: string },
  ) {
    const existing = await this.prisma.clubhouseBlockedPeriod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Blocked period not found.");
    }

    await this.ensureNoConflicts({
      startAt: input.startAt,
      endAt: input.endAt,
      excludeBlockedPeriodId: id,
    });

    return this.prisma.clubhouseBlockedPeriod.update({
      where: { id },
      data: {
        startAt: input.startAt,
        endAt: input.endAt,
        reason: input.reason.trim(),
      },
    });
  }

  async deleteBlockedPeriod(id: string) {
    const existing = await this.prisma.clubhouseBlockedPeriod.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Blocked period not found.");
    }

    await this.prisma.clubhouseBlockedPeriod.delete({ where: { id } });
  }
}
