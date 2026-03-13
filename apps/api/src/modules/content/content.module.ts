import { Module } from "@nestjs/common";
import {
  MediaPrismaRepository,
  PageBlocksPrismaRepository,
  NavigationItemsPrismaRepository,
  PagesPrismaRepository,
  ContentTypesPrismaRepository,
  ContentItemsPrismaRepository,
  TaxonomiesPrismaRepository,
  TermsPrismaRepository,
  ContentItemTermsPrismaRepository,
  SiteSettingsPrismaRepository,
} from "@org/domain-adapters-prisma";
import { ContentController } from "./content.controller";
import { PublicContentController } from "./public-content.controller";
import { TaxonomiesAdminController } from "./taxonomies-admin.controller";
import { LocalFileStorageProvider } from "./local-file-storage.provider";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { AuthModule } from "../auth/auth.module";
import {
  MEDIA_UPLOAD_SCANNER,
  NoopMediaUploadScanner,
} from "./media-upload-scanner";
import { resolveMediaStorageProvider } from "./media-storage-provider.config";

@Module({
  imports: [AuthModule],
  controllers: [
    PublicContentController,
    ContentController,
    TaxonomiesAdminController,
    MediaController,
  ],
  providers: [
    {
      provide: "PagesRepository",
      useClass: PagesPrismaRepository,
    },
    {
      provide: "ContentTypesRepository",
      useClass: ContentTypesPrismaRepository,
    },
    {
      provide: "ContentItemsRepository",
      useClass: ContentItemsPrismaRepository,
    },
    {
      provide: "PageBlocksRepository",
      useClass: PageBlocksPrismaRepository,
    },
    {
      provide: "TaxonomiesRepository",
      useClass: TaxonomiesPrismaRepository,
    },
    {
      provide: "TermsRepository",
      useClass: TermsPrismaRepository,
    },
    {
      provide: "ContentItemTermsRepository",
      useClass: ContentItemTermsPrismaRepository,
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
      useFactory: () => {
        const selectedProvider = resolveMediaStorageProvider();
        switch (selectedProvider) {
          case "local":
            return new LocalFileStorageProvider();
        }
      },
    },
    {
      provide: MEDIA_UPLOAD_SCANNER,
      useClass: NoopMediaUploadScanner,
    },
    MediaService,
  ],
})
export class ContentModule {}
