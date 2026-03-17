import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes } from "crypto";

const QR_VERSION = "bil.v1";

@Injectable()
export class TicketQrService {
  private getSecret(): string {
    return process.env.TICKET_QR_SECRET ?? process.env.JWT_SECRET ?? "dev-ticket-qr-secret";
  }

  generatePayload(): string {
    const nonce = randomBytes(18).toString("base64url");
    const signature = createHmac("sha256", this.getSecret())
      .update(`${QR_VERSION}.${nonce}`)
      .digest("base64url")
      .slice(0, 22);

    return `${QR_VERSION}.${nonce}.${signature}`;
  }

  isPayloadShapeValid(value: string): boolean {
    const parts = value.split(".");
    if (parts.length !== 4) {
      return false;
    }

    return parts[0] === "bil" && parts[1] === "v1" && parts[2].length > 0 && parts[3].length > 0;
  }

  toDataUrl(payload: string): string {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(payload)}`;
  }
}
