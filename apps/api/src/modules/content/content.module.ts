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
import { LocalFileStorageProvider } from "./local-file-storage.provider";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";

@Module({
  controllers: [ContentController, MediaController],
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
    {
      provide: "MediaStorageProvider",
      useClass: LocalFileStorageProvider,
    },
    MediaService,
  ],
})
export class ContentModule {}
