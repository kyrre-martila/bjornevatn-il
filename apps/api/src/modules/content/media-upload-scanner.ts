import { Injectable } from "@nestjs/common";

export const MEDIA_UPLOAD_SCANNER = "MediaUploadScanner";

export type MediaUploadScanInput = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
};

export interface MediaUploadScanner {
  scan(input: MediaUploadScanInput): Promise<void>;
}

@Injectable()
export class NoopMediaUploadScanner implements MediaUploadScanner {
  async scan(input: MediaUploadScanInput): Promise<void> {
    void input;
  }
}
