import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";

import { requireMinimumRole } from "../../src/common/auth/admin-access";

describe("admin-access role normalization", () => {
  function makeReq(): Request {
    return {
      headers: { authorization: "Bearer token" },
      cookies: {},
    } as unknown as Request;
  }

  it("accepts canonical super_admin", async () => {
    const auth = {
      validateUser: jest.fn().mockResolvedValue({ id: "u1", role: "super_admin" }),
    } as any;

    await expect(requireMinimumRole(makeReq(), auth, "super_admin")).resolves.toBe("super_admin");
  });

  it("maps legacy superadmin to super_admin", async () => {
    const auth = {
      validateUser: jest.fn().mockResolvedValue({ id: "u1", role: "superadmin" }),
    } as any;

    await expect(requireMinimumRole(makeReq(), auth, "super_admin")).resolves.toBe("super_admin");
  });

  it("rejects invalid roles", async () => {
    const auth = {
      validateUser: jest.fn().mockResolvedValue({ id: "u1", role: "owner" }),
    } as any;

    await expect(requireMinimumRole(makeReq(), auth, "admin")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
