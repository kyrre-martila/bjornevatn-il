import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../../src/modules/health/health.controller";

describe("HealthController", () => {
  it("returns dependency-up readiness payload when DB query succeeds", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ one: 1 }]),
    };

    const controller = new HealthController(prisma as never);

    await expect(controller.ready()).resolves.toEqual({
      status: "ok",
      check: "ready",
      dependencies: {
        database: "up",
      },
    });
  });

  it("throws 503 readiness payload when DB query fails", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error("connection refused")),
    };

    const controller = new HealthController(prisma as never);

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await controller.ready().catch((error: unknown) => {
      const exception = error as ServiceUnavailableException;
      expect(exception.getResponse()).toEqual({
        status: "error",
        check: "ready",
        dependencies: {
          database: "down",
        },
        reason: "connection refused",
      });
    });
  });
});
