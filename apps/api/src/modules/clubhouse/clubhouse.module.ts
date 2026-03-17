import { Module } from "@nestjs/common";
import { ClubhouseController } from "./clubhouse.controller";
import { ClubhouseService } from "./clubhouse.service";

@Module({
  controllers: [ClubhouseController],
  providers: [ClubhouseService],
  exports: [ClubhouseService],
})
export class ClubhouseModule {}
