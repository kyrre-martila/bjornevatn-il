export type MediaUploadFile = {
  buffer: Uint8Array;
  originalName: string;
  mimeType: string;
};

export type MediaUploadMetadata = {
  alt: string;
};

export type UploadedMedia = {
  id: string;
};

export interface MediaStorageProvider {
  upload(file: MediaUploadFile, metadata: MediaUploadMetadata): Promise<UploadedMedia>;
  delete(id: string): Promise<void>;
  getUrl(id: string): string;
}
