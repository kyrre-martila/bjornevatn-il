import { BadRequestException, Injectable } from "@nestjs/common";
import { TicketSaleStatus, TicketStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type RequestedTicketSelection = {
  ticketType: string;
  quantity: number;
};

export type TicketTypeConfig = {
  name: string;
  price: number;
  maxPerOrder: number;
  totalAvailable: number;
  description?: string;
  sortOrder: number;
};

@Injectable()
export class TicketAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  validateSaleWindow(ticketSale: {
    status: TicketSaleStatus;
    saleStartAt: Date;
    saleEndAt: Date;
  }): void {
    const now = Date.now();

    if (ticketSale.status !== TicketSaleStatus.active) {
      throw new BadRequestException("Ticket sale is not active.");
    }

    if (ticketSale.saleStartAt.getTime() > now) {
      throw new BadRequestException("Ticket sale has not started.");
    }

    if (ticketSale.saleEndAt.getTime() < now) {
      throw new BadRequestException("Ticket sale has ended.");
    }
  }

  async validateSelection(input: {
    ticketSaleId: string;
    ticketTypes: TicketTypeConfig[];
    maxTickets: number;
    selection: RequestedTicketSelection[];
  }): Promise<void> {
    const filteredSelection = input.selection.filter(
      (item) => item.quantity > 0,
    );

    if (!filteredSelection.length) {
      throw new BadRequestException("Select at least one ticket.");
    }

    const configuredTypes = new Map(
      input.ticketTypes.map((type) => [type.name, type]),
    );
    for (const requested of filteredSelection) {
      const config = configuredTypes.get(requested.ticketType);
      if (!config) {
        throw new BadRequestException(
          `Unknown ticket type: ${requested.ticketType}.`,
        );
      }
      if (requested.quantity > config.maxPerOrder) {
        throw new BadRequestException(
          `Ticket type ${requested.ticketType} exceeds max per order (${config.maxPerOrder}).`,
        );
      }
    }

    const soldQuantities = await this.prisma.ticket.groupBy({
      by: ["ticketType"],
      where: {
        ticketSaleId: input.ticketSaleId,
        status: {
          in: [
            TicketStatus.reserved,
            TicketStatus.confirmed,
            TicketStatus.used,
          ],
        },
      },
      _sum: { quantity: true },
    });

    const soldByType = new Map(
      soldQuantities.map((entry) => [
        entry.ticketType,
        entry._sum.quantity ?? 0,
      ]),
    );

    for (const requested of filteredSelection) {
      const config = configuredTypes.get(requested.ticketType);
      if (!config) {
        continue;
      }
      const sold = soldByType.get(requested.ticketType) ?? 0;
      const remaining = config.totalAvailable - sold;
      if (requested.quantity > remaining) {
        throw new BadRequestException(
          `Not enough remaining tickets for ${requested.ticketType}. Remaining: ${Math.max(0, remaining)}.`,
        );
      }
    }

    const alreadySoldCount = soldQuantities.reduce(
      (total, typeQuantity) => total + (typeQuantity._sum.quantity ?? 0),
      0,
    );
    const requestedTotal = filteredSelection.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    if (alreadySoldCount + requestedTotal > input.maxTickets) {
      throw new BadRequestException(
        "Requested tickets exceed sale max ticket limit.",
      );
    }
  }
}
