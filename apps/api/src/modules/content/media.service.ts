import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { fromBuffer as detectFileTypeFromBuffer } from "file-type";
import { imageSize } from "image-size";
import type { Media, MediaRepository, MediaStorageProvider } from "@org/domain";

export type UploadMediaInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  alt: string;
};

type ImageMetadata = {
  width: number | null;
  height: number | null;
  mimeType: string | null;
};

@Injectable()
export class MediaService {
  private static readonly allowedMimeTypes = new Set(["image/png", "image/jpeg"]);

  constructor(
    @Inject("MediaRepository")
    private readonly mediaRepository: MediaRepository,
    @Inject("MediaStorageProvider")
    private readonly mediaStorageProvider: MediaStorageProvider,
  ) {}

  async upload(input: UploadMediaInput): Promise<Media> {
    const detectedMimeType = await this.detectAndValidateMimeType(input);

    const stored = await this.mediaStorageProvider.upload(
      {
        buffer: input.fileBuffer,
        originalName: input.fileName,
        mimeType: detectedMimeType,
      },
      {
        alt: input.alt,
      },
    );

    const imageMetadata = this.extractImageMetadata(input.fileBuffer, detectedMimeType);
    if (imageMetadata.width === null || imageMetadata.height === null) {
      throw new BadRequestException("Uploaded file is malformed or unreadable.");
    }

    return this.mediaRepository.create({
      url: this.mediaStorageProvider.getUrl(stored.id),
      alt: input.alt,
      width: imageMetadata.width,
      height: imageMetadata.height,
      mimeType: imageMetadata.mimeType ?? detectedMimeType,
      sizeBytes: input.fileBuffer.byteLength,
      originalFilename: input.fileName,
      storageKey: stored.id,
    });
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

  async list(): Promise<Media[]> {
    return this.mediaRepository.findMany();
  }

  async update(mediaId: string, data: { alt?: string }): Promise<Media> {
    return this.mediaRepository.update(mediaId, data);
  }

  async delete(mediaId: string): Promise<void> {
    const media = await this.mediaRepository.findById(mediaId);
    if (!media) {
      return;
    }

    const storedFileId = media.storageKey ?? this.extractStoredFileId(media.url);
    await this.mediaStorageProvider.delete(storedFileId);
    await this.mediaRepository.delete(mediaId);
  }

  private extractStoredFileId(url: string): string {
    const segments = url.split("/").filter(Boolean);
    return segments.at(-1) ?? url;
  }

  private extractImageMetadata(fileBuffer: Buffer, mimeType: string): ImageMetadata {
    const metadata = this.safeReadImageSize(fileBuffer);

    const width = metadata.width ?? null;
    const height = metadata.height ?? null;
    if (!width || !height) {
      return { width: null, height: null, mimeType: null };
    }

    const detectedMimeType = this.normalizeMimeType(this.imageTypeToMimeType(metadata.type));
    if (detectedMimeType && detectedMimeType !== mimeType) {
      throw new BadRequestException(
        `Uploaded file image metadata type mismatch: detected "${mimeType}" but metadata indicates "${detectedMimeType}".`,
      );
    }

    return { width, height, mimeType: detectedMimeType || mimeType };
  }

  private safeReadImageSize(fileBuffer: Buffer) {
    try {
      return imageSize(fileBuffer);
    } catch {
      throw new BadRequestException("Uploaded file is malformed or unreadable.");
    }
  }

  private imageTypeToMimeType(imageType: string | undefined): string {
    switch (imageType) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      default:
        return "";
    }
  }


}
