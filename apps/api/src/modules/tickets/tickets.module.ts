import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TicketAvailabilityService } from "./ticket-availability.service";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketAvailabilityService],
  exports: [TicketsService, TicketAvailabilityService],
})
export class TicketsModule {}
