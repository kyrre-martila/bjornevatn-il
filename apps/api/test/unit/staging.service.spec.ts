import { ConflictException, InternalServerErrorException } from "@nestjs/common";

import { StagingAdminService } from "../../src/modules/staging/staging.service";

describe("StagingAdminService", () => {
  it("returns a default status when staging has never been initialized", async () => {
    const prisma = {
      siteEnvironmentStatus: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new StagingAdminService(
      prisma,
      { get: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

    await expect(service.getStatus()).resolves.toEqual({
      environment: "staging",
      exists: false,
      state: "deleted",
      lockStatus: "idle",
      message: "Staging environment has not been initialized.",
      lastResetAt: null,
      lastPushedAt: null,
      updatedAt: null,
      actor: null,
    });
  });

  it("rejects destructive actions when a staging lock is already active", async () => {
    const prisma = {
      siteEnvironmentStatus: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as any;

    const service = new StagingAdminService(
      prisma,
      { get: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

    await expect(
      service.resetFromLive({ userId: "user-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("marks staging as stale and unlocks if reset fails mid-way", async () => {
    const prisma = {
      siteEnvironmentStatus: {
        upsert: jest
          .fn()
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const service = new StagingAdminService(
      prisma,
      { get: jest.fn().mockReturnValue(undefined) } as any,
      { log: jest.fn() } as any,
    );

    await expect(
      service.resetFromLive({ userId: "user-1" }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(prisma.siteEnvironmentStatus.update).toHaveBeenCalledWith({
      where: { environment: "staging" },
      data: {
        state: "stale",
        lockStatus: "idle",
        lastActorUserId: "user-1",
      },
    });
  });
});
