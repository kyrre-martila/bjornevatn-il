import { UnauthorizedException } from "@nestjs/common";
import { TicketsService } from "../../src/modules/tickets/tickets.service";

describe("TicketsService public order lookup", () => {
  function makeService() {
    const prisma = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const availability = {} as any;
    const qr = {} as any;
    return { service: new TicketsService(prisma, availability, qr), prisma };
  }

  it("requires order lookup token", async () => {
    const { service } = makeService();
    await expect(service.getPublicOrderByReference("BIL-1")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
