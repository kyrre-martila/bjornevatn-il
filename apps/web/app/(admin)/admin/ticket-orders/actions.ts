"use server";

import { revalidatePath } from "next/cache";
import { updateAdminTicketOrderStatus } from "../../../../lib/admin/tickets";

export async function updateTicketOrderStatusAction(formData: FormData) {
  const orderReference = String(formData.get("orderReference") ?? "");
  const status = String(formData.get("status") ?? "");

  const ok = await updateAdminTicketOrderStatus(orderReference, status);
  if (ok) {
    revalidatePath("/admin/ticket-orders");
  }
}
