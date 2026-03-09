import { Injectable } from "@nestjs/common";
import type {
  MediaStorageProvider,
  MediaUploadFile,
  MediaUploadMetadata,
  UploadedMedia,
} from "@org/domain";

@Injectable()
export class SupabaseStorageProvider implements MediaStorageProvider {
  async upload(file: MediaUploadFile, metadata: MediaUploadMetadata): Promise<UploadedMedia> {
    void file;
    void metadata;
    throw new Error("SupabaseStorageProvider is not implemented");
  }

  async delete(id: string): Promise<void> {
    void id;
    throw new Error("SupabaseStorageProvider is not implemented");
  }

  getUrl(id: string): string {
    void id;
    throw new Error("SupabaseStorageProvider is not implemented");
  }
}
