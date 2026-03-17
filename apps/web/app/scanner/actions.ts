"use server";

import { confirmTicketScan, validateTicketScan } from "../../lib/tickets";

export async function validateScanAction(formData: FormData) {
  const qrCodeValue = String(formData.get("qrCodeValue") ?? "");
  return validateTicketScan(qrCodeValue, false);
}

export async function confirmScanAction(formData: FormData) {
  const qrCodeValue = String(formData.get("qrCodeValue") ?? "");
  const allowOverride = String(formData.get("allowOverride") ?? "") === "1";
  return confirmTicketScan(qrCodeValue, allowOverride);
}
