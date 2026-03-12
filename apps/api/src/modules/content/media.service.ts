import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { fromBuffer as detectFileTypeFromBuffer } from "file-type";
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
      mimeType: detectedMimeType,
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
    if (mimeType === "image/png") {
      return this.readPngMetadata(fileBuffer);
    }

    if (mimeType === "image/jpeg") {
      return this.readJpegMetadata(fileBuffer);
    }


    return { width: null, height: null };
  }

  private readPngMetadata(buffer: Buffer): ImageMetadata {
    if (buffer.length < 24) {
      return { width: null, height: null };
    }

    const pngSignature = "89504e470d0a1a0a";
    if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
      return { width: null, height: null };
    }

    const ihdrLength = buffer.readUInt32BE(8);
    const ihdrChunkType = buffer.subarray(12, 16).toString("ascii");
    if (ihdrLength !== 13 || ihdrChunkType !== "IHDR") {
      return { width: null, height: null };
    }

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width === 0 || height === 0) {
      return { width: null, height: null };
    }

    return { width, height };
  }

  private readJpegMetadata(buffer: Buffer): ImageMetadata {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return { width: null, height: null };
    }

    let offset = 2;

    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);

      if (length < 2 || offset + 2 + length > buffer.length) {
        return { width: null, height: null };
      }

      const isSofMarker =
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf;

      if (isSofMarker && length >= 7) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        if (width === 0 || height === 0) {
          return { width: null, height: null };
        }

        return { width, height };
      }

      offset += 2 + length;
    }

    return { width: null, height: null };
  }


}
