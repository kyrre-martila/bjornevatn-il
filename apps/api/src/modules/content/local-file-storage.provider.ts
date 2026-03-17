import { Injectable } from "@nestjs/common";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  MediaStorageProvider,
  MediaUploadFile,
  MediaUploadMetadata,
  UploadedMedia,
} from "@org/domain";

@Injectable()
export class LocalFileStorageProvider implements MediaStorageProvider {
  private readonly uploadsRootDir = join(process.cwd(), "uploads", "media");
  private readonly publicPrefix = "/uploads/media";

  async uploadFile(file: MediaUploadFile, metadata?: MediaUploadMetadata): Promise<UploadedMedia> {
    void metadata;
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const dayFolder = join(year, month, day);
    const targetDir = join(this.uploadsRootDir, dayFolder);
    await mkdir(targetDir, { recursive: true });

    const extension = this.normalizeExtension(file.originalName, file.mimeType);
    const baseName = this.toSafeBaseName(file.originalName);
    const uniqueName = `${baseName}-${randomUUID()}${extension}`;
    const storageKey = join(dayFolder, uniqueName).replaceAll("\\", "/");
    await writeFile(join(this.uploadsRootDir, storageKey), file.buffer);

    return {
      storageKey,
      fileName: uniqueName,
    };
  }

  async deleteFile(storageKey: string): Promise<void> {
    const destination = join(this.uploadsRootDir, storageKey);
    await unlink(destination).catch(() => undefined);
  }

  getPublicUrl(storageKey: string): string {
    return `${this.publicPrefix}/${storageKey}`;
  }

  private toSafeBaseName(originalName: string): string {
    const nameWithoutExt = basename(originalName, extname(originalName));
    const safe = nameWithoutExt
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    return safe || "media";
  }

  private normalizeExtension(originalName: string, mimeType: string): string {
    const ext = extname(originalName).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") {
      return ".jpg";
    }
    if (ext === ".png") {
      return ".png";
    }

    if (mimeType === "image/jpeg") {
      return ".jpg";
    }
    if (mimeType === "image/png") {
      return ".png";
    }

    return ".bin";
  }
}
