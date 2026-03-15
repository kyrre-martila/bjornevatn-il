import { AuditService } from "../../src/modules/audit/audit.service";

describe("AuditService", () => {
  it("applies offset pagination and list guardrails", async () => {
    const prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new AuditService(prisma);

    await service.list({ limit: 999, offset: 10 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 100,
      }),
    );
  });

  it("uses cursor pagination when cursor is provided", async () => {
    const prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new AuditService(prisma);

    await service.list({ cursor: "audit-123", limit: 25, offset: 20 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "audit-123" },
        take: 25,
      }),
    );
  });
});
