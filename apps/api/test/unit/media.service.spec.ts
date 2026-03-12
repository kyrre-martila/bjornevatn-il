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
  upload: jest.Mock;
  delete: jest.Mock;
  getUrl: jest.Mock;
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
    upload: jest.fn().mockResolvedValue({ id: "stored-file-1" }),
    delete: jest.fn(),
    getUrl: jest.fn().mockReturnValue("/uploads/stored-file-1"),
  };

  mediaRepository.create.mockImplementation((value) => Promise.resolve({ id: "media-1", ...value }));

  return {
    service: new MediaService(mediaRepository as never, mediaStorageProvider as never),
    mediaRepository,
    mediaStorageProvider,
  };
};

describe("MediaService", () => {
  it("stores the detected mime type instead of trusting the client mime type", async () => {
    const { service, mediaRepository, mediaStorageProvider } = createService();

    const result = await service.upload({
      fileBuffer: Buffer.from(tinyPngBase64, "base64"),
      fileName: "tiny.png",
      mimeType: "image/png",
      alt: "Tiny",
    });

    expect(mediaStorageProvider.upload).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png" }),
      expect.any(Object),
    );
    expect(mediaRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "image/png", width: 1, height: 1 }),
    );
    expect(result.mimeType).toBe("image/png");
  });

  it("rejects uploads when claimed type does not match file contents", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.from(tinyPngBase64, "base64"),
        fileName: "fake.jpg",
        mimeType: "image/jpeg",
        alt: "Mismatch",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects unsupported detected image types", async () => {
    const { service } = createService();

    await expect(
      service.upload({
        fileBuffer: Buffer.from(tinyGifBase64, "base64"),
        fileName: "tiny.gif",
        mimeType: "image/gif",
        alt: "Gif",
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
        alt: "Broken",
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
        alt: "Tiny png",
      }),
    ).resolves.toEqual(expect.objectContaining({ mimeType: "image/png" }));
  });
});
