import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { TicketSaleStatus, TicketStatus } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
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
import { AuthService } from "../auth/auth.service";
import { TicketTypeConfig } from "./ticket-availability.service";
import { TicketsService } from "./tickets.service";

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
}

class UpdateOrderStatusDto {
  @IsIn(["confirmed", "cancelled", "used"])
  status!: TicketStatus;
}

@ApiTags("tickets")
@Controller("tickets")
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly auth: AuthService,
  ) {}

  @Get("sales/public")
  listPublicSales() {
    return this.ticketsService.listPublicTicketSales();
  }

  @Get("sales/public/match/:matchId")
  getPublicSale(@Param("matchId") matchId: string) {
    return this.ticketsService.getPublicTicketSaleByMatchId(matchId);
  }

  @Post("orders")
  createOrder(@Body() body: CreateTicketOrderDto) {
    return this.ticketsService.createTicketOrder(body);
  }

  @Get("admin/sales")
  async listAdminSales(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.ticketsService.listAdminTicketSales();
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
  async listAdminOrders(@Req() req: Request) {
    await requireMinimumRole(req, this.auth, "admin");
    return this.ticketsService.listAdminTicketOrders();
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
