import { Injectable } from "@nestjs/common";
import type {
  MediaStorageProvider,
  MediaUploadFile,
  MediaUploadMetadata,
  UploadedMedia,
} from "@org/domain";

@Injectable()
export class R2StorageProvider implements MediaStorageProvider {
  async uploadFile(file: MediaUploadFile, metadata?: MediaUploadMetadata): Promise<UploadedMedia> {
    void file;
    void metadata;
    throw new Error("R2StorageProvider is an extension point and is not implemented in this blueprint. Keep MEDIA_STORAGE_PROVIDER=local until you provide a production-ready R2 implementation.");
  }

  async deleteFile(id: string): Promise<void> {
    void id;
    throw new Error("R2StorageProvider is an extension point and is not implemented in this blueprint. Keep MEDIA_STORAGE_PROVIDER=local until you provide a production-ready R2 implementation.");
  }

  getPublicUrl(id: string): string {
    void id;
    throw new Error("R2StorageProvider is an extension point and is not implemented in this blueprint. Keep MEDIA_STORAGE_PROVIDER=local until you provide a production-ready R2 implementation.");
  }
}
