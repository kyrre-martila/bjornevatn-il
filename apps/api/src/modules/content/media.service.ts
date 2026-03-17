import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { fromBuffer as detectFileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import type { Media, MediaRepository, MediaStorageProvider } from "@org/domain";
import { MEDIA_UPLOAD_SCANNER, type MediaUploadScanner } from "./media-upload-scanner";

export type UploadMediaInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  altText: string;
  caption?: string;
  uploadedBy?: string;
};

type ImageMetadata = {
  width: number;
  height: number;
  mimeType: string;
};

@Injectable()
export class MediaService {
  private static readonly allowedMimeTypes = new Set(["image/png", "image/jpeg"]);
  private static readonly maxUploadBytes = 10 * 1024 * 1024;

  constructor(
    @Inject("MediaRepository")
    private readonly mediaRepository: MediaRepository,
    @Inject("MediaStorageProvider")
    private readonly mediaStorageProvider: MediaStorageProvider,
    @Inject(MEDIA_UPLOAD_SCANNER)
    private readonly uploadScanner: MediaUploadScanner,
  ) {}

  async upload(input: UploadMediaInput): Promise<Media> {
    this.ensureFileSizeWithinLimits(input.fileBuffer.byteLength);

    const detectedMimeType = await this.detectAndValidateMimeType(input);
    const imageMetadata = await this.extractImageMetadata(input.fileBuffer, detectedMimeType);

    await this.uploadScanner.scan({
      buffer: input.fileBuffer,
      fileName: input.fileName,
      mimeType: detectedMimeType,
    });

    const stored = await this.mediaStorageProvider.uploadFile(
      {
        buffer: input.fileBuffer,
        originalName: input.fileName,
        mimeType: detectedMimeType,
      },
      {
        altText: input.altText,
        caption: input.caption,
        uploadedBy: input.uploadedBy,
      },
    );

    return this.mediaRepository.create({
      fileName: stored.fileName,
      originalName: input.fileName,
      mimeType: imageMetadata.mimeType,
      fileSize: input.fileBuffer.byteLength,
      width: imageMetadata.width,
      height: imageMetadata.height,
      url: this.mediaStorageProvider.getPublicUrl(stored.storageKey),
      storageKey: stored.storageKey,
      altText: input.altText,
      caption: input.caption ?? null,
      uploadedBy: input.uploadedBy ?? null,
    });
  }

  private ensureFileSizeWithinLimits(sizeBytes: number): void {
    if (sizeBytes > MediaService.maxUploadBytes) {
      throw new BadRequestException(
        `Uploaded file is too large (${sizeBytes} bytes). Maximum allowed size is ${MediaService.maxUploadBytes} bytes.`,
      );
    }
  }

  private async detectAndValidateMimeType(input: UploadMediaInput): Promise<string> {
    const detected = await detectFileTypeFromBuffer(input.fileBuffer);
    if (!detected) {
      throw new BadRequestException("Unable to detect file type from uploaded content.");
    }

    if (!MediaService.allowedMimeTypes.has(detected.mime)) {
      throw new BadRequestException(
        `Unsupported media type \"${detected.mime}\". Allowed types: image/png, image/jpeg.`,
      );
    }

    const claimedMimeType = this.normalizeMimeType(input.mimeType);
    if (claimedMimeType && claimedMimeType !== detected.mime) {
      throw new BadRequestException(
        `Uploaded file content type mismatch: claimed \"${claimedMimeType}\" but detected \"${detected.mime}\".`,
      );
    }

    return detected.mime;
  }

  private normalizeMimeType(mimeType: string): string {
    const normalized = mimeType.trim().toLowerCase();

    if (!normalized) {
      return "";
    }

    if (normalized === "image/jpg") {
      return "image/jpeg";
    }

    return normalized;
  }

  async list(pagination?: { offset?: number; limit?: number }): Promise<Media[]> {
    return this.mediaRepository.findMany(pagination);
  }

  async findById(mediaId: string): Promise<Media | null> {
    return this.mediaRepository.findById(mediaId);
  }

  async update(mediaId: string, data: { altText?: string; caption?: string }): Promise<Media> {
    return this.mediaRepository.update(mediaId, data);
  }

  async delete(mediaId: string): Promise<void> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      return;
    }

    const storedFileId = media.storageKey ?? this.extractStoredFileId(media.url);
    await this.mediaStorageProvider.deleteFile(storedFileId);
    await this.mediaRepository.delete(mediaId);
  }

  private extractStoredFileId(url: string): string {
    const marker = "/uploads/media/";
    if (url.includes(marker)) {
      return url.split(marker)[1] ?? url;
    }

    const segments = url.split("/").filter(Boolean);
    return segments.at(-1) ?? url;
  }

  private async extractImageMetadata(fileBuffer: Buffer, mimeType: string): Promise<ImageMetadata> {
    let metadata;

    try {
      metadata = await sharp(fileBuffer, { failOn: "error", limitInputPixels: 100_000_000 }).metadata();
    } catch {
      throw new BadRequestException("Uploaded file is malformed or unreadable.");
    }

    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height) {
      throw new BadRequestException("Uploaded file is malformed or unreadable.");
    }

    const metadataMimeType = metadata.format ? this.imageFormatToMimeType(metadata.format) : "";
    if (!metadataMimeType) {
      throw new BadRequestException("Unsupported or malformed image metadata.");
    }

    if (metadataMimeType !== mimeType) {
      throw new BadRequestException(
        `Uploaded file image metadata type mismatch: detected "${mimeType}" but metadata indicates "${metadataMimeType}".`,
      );
    }

    return { width, height, mimeType: metadataMimeType };
  }

  private imageFormatToMimeType(format: string): string {
    switch (format) {
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      default:
        return "";
    }
  }
}
