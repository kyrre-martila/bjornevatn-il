import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  Prisma,
  TicketSaleStatus,
  TicketStatus,
  TicketValidationStatus,
} from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { TicketQrService } from "./ticket-qr.service";
import {
  RequestedTicketSelection,
  TicketAvailabilityService,
  TicketTypeConfig,
} from "./ticket-availability.service";

function parseTicketTypes(
  ticketTypesJson: Prisma.JsonValue,
): TicketTypeConfig[] {
  if (!Array.isArray(ticketTypesJson)) {
    throw new BadRequestException("Ticket sale ticketTypes is invalid.");
  }

  return ticketTypesJson.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new BadRequestException("Invalid ticket type config.");
    }
    const ticketType = entry as Record<string, unknown>;
    return {
      name: String(ticketType.name ?? ""),
      price: Number(ticketType.price ?? 0),
      maxPerOrder: Number(ticketType.maxPerOrder ?? 0),
      totalAvailable: Number(ticketType.totalAvailable ?? 0),
      description: ticketType.description
        ? String(ticketType.description)
        : undefined,
      sortOrder: Number(ticketType.sortOrder ?? index),
    };
  });
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: TicketAvailabilityService,
    private readonly qrService: TicketQrService,
  ) {}

  private getOrderLookupSecret(): string {
    return process.env.TICKET_ORDER_LOOKUP_SECRET ?? process.env.JWT_SECRET ?? "dev-order-lookup-secret";
  }

  private createOrderLookupToken(orderReference: string): string {
    const issuedAt = Date.now();
    const payload = `${orderReference}.${issuedAt}`;
    const signature = createHmac("sha256", this.getOrderLookupSecret()).update(payload).digest("base64url");
    return `${payload}.${signature}`;
  }

  private verifyOrderLookupToken(orderReference: string, token?: string): void {
    if (!token) {
      throw new UnauthorizedException("Order lookup token is required.");
    }
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new UnauthorizedException("Invalid order lookup token.");
    }
    const [tokenReference, issuedAtRaw, signature] = parts;
    if (tokenReference !== orderReference || !/^\d+$/.test(issuedAtRaw)) {
      throw new UnauthorizedException("Invalid order lookup token.");
    }

    const maxAgeMs = Number(process.env.TICKET_ORDER_LOOKUP_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 24 * 14);
    const issuedAt = Number(issuedAtRaw);
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > maxAgeMs) {
      throw new UnauthorizedException("Order lookup session has expired.");
    }

    const expected = createHmac("sha256", this.getOrderLookupSecret())
      .update(`${tokenReference}.${issuedAtRaw}`)
      .digest("base64url");

    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(signature);
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      throw new UnauthorizedException("Invalid order lookup token.");
    }
  }

  private async getSoldByType(
    ticketSaleId: string,
  ): Promise<Map<string, number>> {
    const soldQuantities = await this.prisma.ticket.groupBy({
      by: ["ticketType"],
      where: {
        ticketSaleId,
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

    return new Map(
      soldQuantities.map((entry) => [
        entry.ticketType,
        entry._sum.quantity ?? 0,
      ]),
    );
  }

  async listPublicTicketSales() {
    return this.prisma.ticketSale.findMany({
      where: {
        status: TicketSaleStatus.active,
        match: {
          contentType: { slug: "match" },
          published: true,
          data: { path: ["ticketSalesEnabled"], equals: true },
        },
      },
      include: {
        match: true,
      },
      orderBy: { saleStartAt: "asc" },
    });
  }

  async getPublicTicketSaleByMatchId(matchId: string) {
    const ticketSale = await this.prisma.ticketSale.findUnique({
      where: { matchId },
      include: { match: true },
    });

    if (!ticketSale) {
      throw new NotFoundException("Ticket sale not found for match.");
    }

    this.availability.validateSaleWindow(ticketSale);

    const ticketTypes = parseTicketTypes(ticketSale.ticketTypes);
    const soldByType = await this.getSoldByType(ticketSale.id);

    return {
      ...ticketSale,
      ticketTypes: ticketTypes.map((ticketType) => ({
        ...ticketType,
        remaining: Math.max(
          0,
          ticketType.totalAvailable - (soldByType.get(ticketType.name) ?? 0),
        ),
      })),
    };
  }

  async createTicketSale(input: {
    matchId: string;
    title: string;
    description?: string;
    ticketTypes: TicketTypeConfig[];
    saleStartAt: Date;
    saleEndAt: Date;
    maxTickets: number;
    status: TicketSaleStatus;
  }) {
    if (input.saleEndAt.getTime() <= input.saleStartAt.getTime()) {
      throw new BadRequestException(
        "saleEndAt must be later than saleStartAt.",
      );
    }

    return this.prisma.ticketSale.create({
      data: {
        ...input,
        ticketTypes: input.ticketTypes as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async listAdminTicketSales() {
    const sales = await this.prisma.ticketSale.findMany({
      include: { match: true, tickets: true },
      orderBy: { createdAt: "desc" },
    });

    return sales.map((sale) => ({
      ...sale,
      totalTicketsSold: sale.tickets
        .filter((ticket) => ticket.status !== TicketStatus.cancelled)
        .reduce((total, ticket) => total + ticket.quantity, 0),
    }));
  }

  async updateTicketSaleStatus(id: string, status: TicketSaleStatus) {
    await this.ensureTicketSale(id);

    return this.prisma.ticketSale.update({
      where: { id },
      data: { status },
    });
  }

  async createTicketOrder(input: {
    matchId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    selections: RequestedTicketSelection[];
  }) {
    const ticketSale = await this.getPublicTicketSaleByMatchId(input.matchId);
    const ticketTypes = parseTicketTypes(
      ticketSale.ticketTypes as Prisma.JsonValue,
    );

    await this.availability.validateSelection({
      ticketSaleId: ticketSale.id,
      ticketTypes,
      maxTickets: ticketSale.maxTickets,
      selection: input.selections,
    });

    const orderReference = `BIL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const qrIssuedAt = new Date();
    const createdTickets = await this.prisma.$transaction(
      input.selections
        .filter((selection) => selection.quantity > 0)
        .map((selection) =>
          this.prisma.ticket.create({
            data: {
              ticketSaleId: ticketSale.id,
              ticketType: selection.ticketType,
              buyerName: input.buyerName,
              buyerEmail: input.buyerEmail,
              buyerPhone: input.buyerPhone,
              quantity: selection.quantity,
              orderReference,
              status: TicketStatus.reserved,
              validationStatus: TicketValidationStatus.valid,
              qrCodeValue: this.qrService.generatePayload(),
              qrIssuedAt,
            },
          }),
        ),
    );

    return {
      orderReference,
      orderLookupToken: this.createOrderLookupToken(orderReference),
      tickets: createdTickets,
      ticketSale,
      match: ticketSale.match,
    };
  }

  async getPublicOrderByReference(orderReference: string, orderLookupToken?: string) {
    this.verifyOrderLookupToken(orderReference, orderLookupToken);

    const tickets = await this.prisma.ticket.findMany({
      where: { orderReference },
      include: { ticketSale: { include: { match: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (tickets.length === 0) {
      throw new NotFoundException("Order not found.");
    }

    const first = tickets[0];
    return {
      orderReference,
      buyerName: first.buyerName.split(" ")[0],
      buyerEmailMasked: first.buyerEmail.replace(/(^.).+(@.*$)/, "$1***$2"),
      status: first.status,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        validationStatus: ticket.validationStatus,
      })),
      match: first.ticketSale.match,
    };
  }

  async listAdminTicketOrders() {
    const tickets = await this.prisma.ticket.findMany({
      include: {
        ticketSale: {
          include: { match: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const grouped = new Map<string, (typeof tickets)[number][]>();

    for (const ticket of tickets) {
      const existing = grouped.get(ticket.orderReference) ?? [];
      existing.push(ticket);
      grouped.set(ticket.orderReference, existing);
    }

    return Array.from(grouped.entries()).map(
      ([orderReference, orderTickets]) => {
        const first = orderTickets[0];
        return {
          orderReference,
          buyerName: first.buyerName,
          buyerEmail: first.buyerEmail,
          match: `${String((first.ticketSale.match.data as Record<string, unknown>).homeTeam ?? "")} vs ${String((first.ticketSale.match.data as Record<string, unknown>).awayTeam ?? "")}`,
          quantity: orderTickets.reduce(
            (total, ticket) => total + ticket.quantity,
            0,
          ),
          createdAt: first.createdAt,
          status: first.status,
          validationStatus: first.validationStatus,
          scanCount: orderTickets.reduce(
            (total, ticket) => total + ticket.scanCount,
            0,
          ),
          firstScannedAt: orderTickets
            .map((ticket) => ticket.firstScannedAt)
            .find((value) => Boolean(value)),
          lastScannedAt: orderTickets
            .map((ticket) => ticket.lastScannedAt)
            .filter((value): value is Date => Boolean(value))
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
          lastScannedBy: orderTickets
            .map((ticket) => ticket.lastScannedBy)
            .find((value) => Boolean(value)) ?? null,
          qrCodePreview:
            first.qrCodeValue.length > 14
              ? `${first.qrCodeValue.slice(0, 7)}...${first.qrCodeValue.slice(-7)}`
              : first.qrCodeValue,
        };
      },
    );
  }

  async updateOrderStatus(orderReference: string, status: TicketStatus) {
    const existing = await this.prisma.ticket.findFirst({
      where: { orderReference },
    });
    if (!existing) {
      throw new NotFoundException("Order not found.");
    }

    await this.prisma.ticket.updateMany({
      where: { orderReference },
      data: {
        status,
        validationStatus:
          status === TicketStatus.cancelled
            ? TicketValidationStatus.cancelled
            : status === TicketStatus.used
              ? TicketValidationStatus.used
              : TicketValidationStatus.valid,
      },
    });

    return { orderReference, status };
  }

  async ensureTicketSale(id: string) {
    const ticketSale = await this.prisma.ticketSale.findUnique({
      where: { id },
    });
    if (!ticketSale) {
      throw new NotFoundException("Ticket sale not found.");
    }
    return ticketSale;
  }
}
