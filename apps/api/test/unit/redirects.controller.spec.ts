jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import type { Request } from "express";

import { RedirectsController } from "../../src/modules/redirects/redirects.controller";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { AuthService } from "../../src/modules/auth/auth.service";
import type { AuditService } from "../../src/modules/audit/audit.service";

describe("RedirectsController", () => {
  function makeRequest(): Request {
    return {
      headers: { authorization: "Bearer test-token" },
      cookies: {},
    } as unknown as Request;
  }

  function makeSut() {
    const prisma = {
      redirectRule: {
        create: jest.fn().mockResolvedValue({
          id: "redirect-1",
          fromPath: "/old",
          toPath: "/new",
          statusCode: 301,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: "redirect-1",
          fromPath: "/old",
          toPath: "/new",
          statusCode: 301,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
        update: jest.fn().mockResolvedValue({
          id: "redirect-1",
          fromPath: "/old-2",
          toPath: "/new-2",
          statusCode: 302,
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
        }),
        delete: jest.fn().mockResolvedValue({ id: "redirect-1" }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    const auth = {
      validateUser: jest.fn().mockResolvedValue({ id: "admin-1", role: "admin" }),
    } as unknown as jest.Mocked<AuthService>;

    const audit = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    const controller = new RedirectsController(prisma, auth, audit);
    return { controller, prisma, audit };
  }

  it("logs before and after values on redirect update", async () => {
    const { controller, audit } = makeSut();

    await controller.update(makeRequest(), "redirect-1", {
      fromPath: "/old-2",
      toPath: "/new-2",
      statusCode: 302,
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "redirect_update",
        entityType: "redirect",
        entityId: "redirect-1",
        metadata: expect.objectContaining({
          before: {
            fromPath: "/old",
            toPath: "/new",
            statusCode: 301,
          },
          after: {
            fromPath: "/old-2",
            toPath: "/new-2",
            statusCode: 302,
          },
        }),
      }),
    );
  });
});
