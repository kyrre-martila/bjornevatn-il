import { Module } from "@nestjs/common";
import {
  MediaPrismaRepository,
  PageBlocksPrismaRepository,
  NavigationItemsPrismaRepository,
  PagesPrismaRepository,
  PostsPrismaRepository,
  SiteSettingsPrismaRepository,
} from "@org/domain-adapters-prisma";
import { ContentController } from "./content.controller";

@Module({
  controllers: [ContentController],
  providers: [
    {
      provide: "PagesRepository",
      useClass: PagesPrismaRepository,
    },
    {
      provide: "PostsRepository",
      useClass: PostsPrismaRepository,
    },
    {
      provide: "PageBlocksRepository",
      useClass: PageBlocksPrismaRepository,
    },
    {
      provide: "NavigationItemsRepository",
      useClass: NavigationItemsPrismaRepository,
    },
    {
      provide: "SiteSettingsRepository",
      useClass: SiteSettingsPrismaRepository,
    },
    {
      provide: "MediaRepository",
      useClass: MediaPrismaRepository,
    },
  ],
})
export class ContentModule {}
