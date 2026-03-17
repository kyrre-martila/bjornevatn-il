import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TicketAvailabilityService } from "./ticket-availability.service";
import { TicketQrService } from "./ticket-qr.service";
import { TicketScanService } from "./ticket-scan.service";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketAvailabilityService,
    TicketQrService,
    TicketScanService,
  ],
  exports: [
    TicketsService,
    TicketAvailabilityService,
    TicketQrService,
    TicketScanService,
  ],
})
export class TicketsModule {}
