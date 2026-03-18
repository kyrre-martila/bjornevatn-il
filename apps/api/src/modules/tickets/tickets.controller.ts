import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  OperationalEventSeverity,
  TicketSaleStatus,
  TicketStatus,
} from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import type { Request } from "express";
import { requireMinimumRole } from "../../common/auth/admin-access";
import { verifySubmissionChallenge } from "../../common/auth/submission-challenge";
import { AuthService } from "../auth/auth.service";
import { TicketScanService } from "./ticket-scan.service";
import { TicketTypeConfig } from "./ticket-availability.service";
import { TicketsService } from "./tickets.service";
import {
  getActorFromRequest,
  getContextFromRequest,
} from "../observability/observability-request.util";
import { ObservabilityService } from "../observability/observability.service";

class TicketTypeDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(1)
  maxPerOrder!: number;

  @IsInt()
  @Min(0)
  totalAvailable!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  sortOrder!: number;
}

class CreateTicketSaleDto {
  @IsString()
  matchId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes!: TicketTypeDto[];

  @Type(() => Date)
  @IsDate()
  saleStartAt!: Date;

  @Type(() => Date)
  @IsDate()
  saleEndAt!: Date;

  @IsInt()
  @Min(1)
  maxTickets!: number;

  @IsIn(["draft", "active", "sold_out", "closed"])
  status!: TicketSaleStatus;
}

class UpdateTicketSaleStatusDto {
  @IsIn(["draft", "active", "sold_out", "closed"])
  status!: TicketSaleStatus;
}

class TicketSelectionDto {
  @IsString()
  ticketType!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

class CreateTicketOrderDto {
  @IsString()
  matchId!: string;

  @IsString()
  buyerName!: string;

  @IsEmail()
  buyerEmail!: string;

  @IsString()
  buyerPhone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketSelectionDto)
  selections!: TicketSelectionDto[];

  @IsOptional()
  @IsString()
  challengeToken?: string;
}

class UpdateOrderStatusDto {
  @IsIn(["confirmed", "cancelled", "used"])
  status!: TicketStatus;
}

class AdminListQueryDto {
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

class ValidateQrDto {
  @IsString()
  qrCodeValue!: string;

  @IsOptional()
  @IsBoolean()
  allowOverride?: boolean;
}

class ConfirmScanDto extends ValidateQrDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly ticketScanService: TicketScanService,
    private readonly auth: AuthService,
    private readonly observability: ObservabilityService,
  ) {}

  @Get("sales/public")
  listPublicSales() {
    return this.observability.timeOperation(
      {
        flow: "ticket_listing_load",
        actor: { type: "public" },
        context: { module: "tickets", route: "sales/public" },
      },
      () => this.ticketsService.listPublicTicketSales(),
    );
  }

  @Get("sales/public/match/:matchId")
  getPublicSale(@Param("matchId") matchId: string) {
    return this.observability.timeOperation(
      {
        flow: "ticket_detail_load",
        actor: { type: "public" },
        context: { module: "tickets", route: "sales/public/match/:matchId" },
        metadata: { matchId },
      },
      () => this.ticketsService.getPublicTicketSaleByMatchId(matchId),
    );
  }

  @Post("orders")
  async createOrder(@Req() req: Request, @Body() body: CreateTicketOrderDto) {
    const context = getContextFromRequest(req, "tickets");

    try {
      verifySubmissionChallenge(body.challengeToken);
    } catch (error) {
      await this.observability.logEvent({
        eventType: "challenge_verification_failed",
        severity: OperationalEventSeverity.warn,
        context,
        metadata: {
          endpointCategory: "ticket_order_creation",
          submissionType: "ticket_order",
          reason:
            error instanceof Error
              ? error.message
              : "Submission challenge failed",
        },
      });
      throw error;
    }

    try {
      const order = await this.observability.timeOperation(
        {
          flow: "ticket_purchase_submission",
          actor: { type: "public" },
          context,
          metadata: { submissionType: "ticket_order" },
        },
        () => this.ticketsService.createTicketOrder(body),
      );

      await this.observability.logEvent({
        eventType: "public_submission_succeeded",
        severity: OperationalEventSeverity.info,
        actor: { type: "public" },
        context,
        metadata: {
          submissionType: "ticket_order",
          orderReference: order.orderReference,
        },
      });

      return order;
    } catch (error) {
      await this.observability.logEvent({
        eventType: "public_submission_failed",
        severity: OperationalEventSeverity.warn,
        actor: { type: "public" },
        context,
        metadata: {
          submissionType: "ticket_order",
          reason:
            error instanceof Error ? error.message : "Ticket order failed",
        },
      });
      throw error;
    }
  }

  @Get("orders/:orderReference")
  async getOrder(
    @Req() req: Request,
    @Param("orderReference") orderReference: string,
    @Query("token") orderLookupToken?: string,
  ) {
    const context = getContextFromRequest(req, "tickets");
    try {
      const order = await this.observability.timeOperation(
        {
          flow: "order_lookup",
          actor: { type: "public" },
          context,
          metadata: { orderReference },
        },
        () =>
          this.ticketsService.getPublicOrderByReference(
            orderReference,
            orderLookupToken,
          ),
      );

      await this.observability.logEvent({
        eventType: "order_lookup_succeeded",
        severity: OperationalEventSeverity.info,
        actor: { type: "public" },
        context,
        metadata: { orderReference },
      });

      return order;
    } catch (error) {
      await this.observability.logEvent({
        eventType: "order_lookup_failed",
        severity: OperationalEventSeverity.warn,
        actor: { type: "public" },
        context,
        metadata: {
          orderReference,
          reason:
            error instanceof Error ? error.message : "Order lookup failed",
        },
      });
      throw error;
    }
  }

  @Post("scanner/validate")
  async validateScan(@Req() req: Request, @Body() body: ValidateQrDto) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    return this.ticketScanService.validateScan({
      qrCodeValue: body.qrCodeValue,
      allowOverride:
        role === "admin" || role === "super_admin" ? body.allowOverride : false,
      scannedBy: undefined,
    });
  }

  @Post("scanner/confirm")
  async confirmScan(@Req() req: Request, @Body() body: ConfirmScanDto) {
    const role = await requireMinimumRole(req, this.auth, "editor");
    return this.ticketScanService.confirmEntry({
      qrCodeValue: body.qrCodeValue,
      allowOverride:
        role === "admin" || role === "super_admin" ? body.allowOverride : false,
      scannedBy: undefined,
      notes: body.notes,
    });
  }

  @Get("admin/sales")
  async listAdminSales(@Req() req: Request, @Query() query: AdminListQueryDto) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.observability.timeOperation(
      {
        flow: "admin_ticket_sales_list",
        actor: getActorFromRequest(req),
        context: getContextFromRequest(req, "tickets"),
        metadata: { page: query.page ?? 1, pageSize: query.pageSize ?? 25 },
        slowThresholdMs: 750,
      },
      () =>
        this.ticketsService.listAdminTicketSales({
          page: query.page,
          pageSize: query.pageSize,
        }),
    );
  }

  @Post("admin/sales")
  async createSale(@Req() req: Request, @Body() body: CreateTicketSaleDto) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.ticketsService.createTicketSale({
      ...body,
      ticketTypes: body.ticketTypes as TicketTypeConfig[],
    });
  }

  @Patch("admin/sales/:id/status")
  async updateSaleStatus(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: UpdateTicketSaleStatusDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.ticketsService.updateTicketSaleStatus(id, body.status);
  }

  @Get("admin/orders")
  async listAdminOrders(
    @Req() req: Request,
    @Query() query: AdminListQueryDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.observability.timeOperation(
      {
        flow: "admin_ticket_orders_list",
        actor: getActorFromRequest(req),
        context: getContextFromRequest(req, "tickets"),
        metadata: { page: query.page ?? 1, pageSize: query.pageSize ?? 25 },
        slowThresholdMs: 750,
      },
      () =>
        this.ticketsService.listAdminTicketOrders({
          page: query.page,
          pageSize: query.pageSize,
        }),
    );
  }

  @Patch("admin/orders/:orderReference/status")
  async updateOrderStatus(
    @Req() req: Request,
    @Param("orderReference") orderReference: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.ticketsService.updateOrderStatus(orderReference, body.status);
  }
}
