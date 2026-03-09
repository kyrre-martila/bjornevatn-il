import { Injectable } from "@nestjs/common";
import type {
  MediaStorageProvider,
  MediaUploadFile,
  MediaUploadMetadata,
  UploadedMedia,
} from "@org/domain";

@Injectable()
export class S3StorageProvider implements MediaStorageProvider {
  async upload(file: MediaUploadFile, metadata: MediaUploadMetadata): Promise<UploadedMedia> {
    void file;
    void metadata;
    throw new Error("S3StorageProvider is not implemented");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("S3StorageProvider is not implemented");
  }

  getUrl(id: string): string {
    void id;
    throw new Error("S3StorageProvider is not implemented");
  }
}
