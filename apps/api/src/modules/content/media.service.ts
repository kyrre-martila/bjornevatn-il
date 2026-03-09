import { Inject, Injectable } from "@nestjs/common";
import type { Media, MediaRepository, MediaStorageProvider } from "@org/domain";

export type UploadMediaInput = {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  alt: string;
};

@Injectable()
export class MediaService {
  constructor(
    @Inject("MediaRepository")
    private readonly mediaRepository: MediaRepository,
    @Inject("MediaStorageProvider")
    private readonly mediaStorageProvider: MediaStorageProvider,
  ) {}

  async upload(input: UploadMediaInput): Promise<Media> {
    const stored = await this.mediaStorageProvider.upload(
      {
        buffer: input.fileBuffer,
        originalName: input.fileName,
        mimeType: input.mimeType,
      },
      {
        alt: input.alt,
      },
    );

    return this.mediaRepository.create({
      url: this.mediaStorageProvider.getUrl(stored.id),
      alt: input.alt,
    });
  }
}
