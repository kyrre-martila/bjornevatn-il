import { TicketScanAction, TicketScanResult, TicketStatus, TicketValidationStatus } from "@prisma/client";
import { TicketScanService } from "../../src/modules/tickets/ticket-scan.service";

describe("TicketScanService", () => {
  function makeService(updateCount = 1) {
    const prisma = {
      ticket: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
      },
      ticketScanLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const qr = {
      isPayloadShapeValid: jest.fn().mockReturnValue(true),
    } as any;

    const service = new TicketScanService(prisma, qr);
    return { service, prisma, qr };
  }

  const ticket = {
    id: "t1",
    buyerName: "Buyer",
    ticketType: "Adult",
    orderReference: "BIL-1",
    validationStatus: TicketValidationStatus.valid,
    scanCount: 0,
    lastScannedAt: null,
    status: TicketStatus.reserved,
    isRevoked: false,
    ticketSale: { match: { id: "m1", title: "Match", data: {} } },
  };

  it("prevents double confirm under concurrent scans", async () => {
    const { service, prisma } = makeService(0);
    prisma.ticket.findUnique.mockResolvedValue(ticket);

    const result = await service.confirmEntry({ qrCodeValue: "bil.v1.a.b" });

    expect(result.reason).toBe("already-used");
    expect(prisma.ticketScanLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: TicketScanAction.confirm_entry, result: TicketScanResult.already_used }),
      }),
    );
  });
});
