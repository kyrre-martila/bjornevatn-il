import { BadRequestException } from "@nestjs/common";

import { MediaService } from "../../src/modules/content/media.service";

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W0eoAAAAASUVORK5CYII=";
const tinyGifBase64 = "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=";

type MediaRepositoryMock = {
  create: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
  findById: jest.Mock;
  delete: jest.Mock;
};

type MediaStorageProviderMock = {
  uploadFile: jest.Mock;
  deleteFile: jest.Mock;
  getPublicUrl: jest.Mock;
};

type MediaUploadScannerMock = {
  scan: jest.Mock;
};

const createService = () => {
  const mediaRepository: MediaRepositoryMock = {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    delete: jest.fn(),
  };

  const mediaStorageProvider: MediaStorageProviderMock = {
    uploadFile: jest.fn().mockResolvedValue({ storageKey: "2026/03/17/stored-file-1.jpg", fileName: "stored-file-1.jpg" }),
    deleteFile: jest.fn(),
    getPublicUrl: jest.fn().mockReturnValue("/uploads/media/2026/03/17/stored-file-1.jpg"),
  };

  const mediaUploadScanner: MediaUploadScannerMock = {
    scan: jest.fn().mockResolvedValue(undefined),
  };

  mediaRepository.create.mockImplementation((value) => Promise.resolve({ id: "media-1", ...value }));

  return {
    service: new MediaService(
      mediaRepository as never,
      mediaStorageProvider as never,
      mediaUploadScanner as never,
    ),
    mediaRepository,
    mediaStorageProvider,
    mediaUploadScanner,
  };
};

describe("MediaService", () => {
  it("stores the detected mime type instead of trusting the client mime type", async () => {
    const { service, mediaRepository, mediaStorageProvider } = createService();

    const result = await service.upload({
      fileBuffer: Buffer.from(tinyPngBase64, "base64"),
      fileName: "tiny.png",
      mimeType: "image/png",
      altText: "Tiny",
    });

    expect(mediaStorageProvider.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png" }),
      expect.any(Object),
    );
    expect(mediaRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png", width: 1, height: 1, fileName: "stored-file-1.jpg" }),
    );
    expect(result.mimeType).toBe("image/png");
  });

  it("runs the upload scanner extension point before storage", async () => {
    const { service, mediaStorageProvider, mediaUploadScanner } = createService();

    await service.upload({
      fileBuffer: Buffer.from(tinyPngBase64, "base64"),
      fileName: "tiny.png",
      mimeType: "image/png",
      altText: "Tiny",
    });

    expect(mediaUploadScanner.scan).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "tiny.png", mimeType: "image/png" }),
    );
    expect(mediaUploadScanner.scan.mock.invocationCallOrder[0]).toBeLessThan(
      mediaStorageProvider.uploadFile.mock.invocationCallOrder[0],
    );
  });

  it("rejects uploads when claimed type does not match file contents", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.from(tinyPngBase64, "base64"),
        fileName: "fake.jpg",
        mimeType: "image/jpeg",
        altText: "Mismatch",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects oversized uploads", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.alloc((10 * 1024 * 1024) + 1),
        fileName: "too-large.png",
        mimeType: "image/png",
        altText: "Too large",
      }),
    ).rejects.toThrow("too large");
  });

  it("rejects unsupported detected image types", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.from(tinyGifBase64, "base64"),
        fileName: "tiny.gif",
        mimeType: "image/gif",
        altText: "Gif",
      }),
    ).rejects.toThrow("Unsupported media type");
  });

  it("rejects malformed files even when type can be detected", async () => {
    const { service } = createService();

    const malformedPng = Buffer.from(tinyPngBase64, "base64");
    malformedPng.writeUInt32BE(0, 16);
    malformedPng.writeUInt32BE(0, 20);

    await expect(
      service.upload({
        fileBuffer: malformedPng,
        fileName: "broken.png",
        mimeType: "image/png",
        altText: "Broken",
      }),
    ).rejects.toThrow("malformed");
  });

  it("accepts supported png files", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.from(tinyPngBase64, "base64"),
        fileName: "tiny.png",
        mimeType: "image/png",
        altText: "Tiny png",
      }),
    ).resolves.toEqual(expect.objectContaining({ mimeType: "image/png" }));
  });
});
