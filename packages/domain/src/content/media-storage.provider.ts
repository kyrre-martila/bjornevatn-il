export type MediaUploadFile = {
  buffer: Uint8Array;
  originalName: string;
  mimeType: string;
};

export type MediaUploadMetadata = {
  altText?: string;
  caption?: string;
  uploadedBy?: string;
};

export type UploadedMedia = {
  storageKey: string;
  fileName: string;
};

export interface StorageProvider {
  uploadFile(file: MediaUploadFile, metadata?: MediaUploadMetadata): Promise<UploadedMedia>;
  deleteFile(storageKey: string): Promise<void>;
  getPublicUrl(storageKey: string): string;
}

// Backwards-compatible alias used by existing content module wiring.
export type MediaStorageProvider = StorageProvider;
