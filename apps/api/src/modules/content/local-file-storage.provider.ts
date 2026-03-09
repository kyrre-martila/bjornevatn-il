import { Injectable } from "@nestjs/common";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  MediaStorageProvider,
  MediaUploadFile,
  MediaUploadMetadata,
  UploadedMedia,
} from "@org/domain";

@Injectable()
export class LocalFileStorageProvider implements MediaStorageProvider {
  private readonly uploadsDir = join(process.cwd(), "uploads");
  private readonly publicPrefix = "/uploads";

  async upload(file: MediaUploadFile, metadata: MediaUploadMetadata): Promise<UploadedMedia> {
    void metadata;
    await mkdir(this.uploadsDir, { recursive: true });
    const extension = extname(file.originalName);
    const id = `${randomUUID()}${extension}`;
    const destination = join(this.uploadsDir, id);
    await writeFile(destination, file.buffer);
    return { id };
  }

  async delete(id: string): Promise<void> {
    const destination = join(this.uploadsDir, id);
    await unlink(destination).catch(() => undefined);
  }

  getUrl(id: string): string {
    return `${this.publicPrefix}/${id}`;
  }
}
