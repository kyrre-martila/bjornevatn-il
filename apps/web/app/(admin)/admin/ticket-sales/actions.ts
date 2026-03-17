"use server";

import { revalidatePath } from "next/cache";
import {
  createAdminTicketSale,
  updateAdminTicketSaleStatus,
} from "../../../../lib/admin/tickets";

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

export async function createTicketSaleAction(formData: FormData) {
  const ok = await createAdminTicketSale({
    matchId: String(formData.get("matchId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    ticketTypes: safeJsonParse(String(formData.get("ticketTypes") ?? "[]")),
    saleStartAt: String(formData.get("saleStartAt") ?? ""),
    saleEndAt: String(formData.get("saleEndAt") ?? ""),
    maxTickets: Number(formData.get("maxTickets") ?? 0),
    status: String(formData.get("status") ?? "draft"),
  });

  if (ok) {
    revalidatePath("/admin/ticket-sales");
  }
}

export async function updateTicketSaleStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const ok = await updateAdminTicketSaleStatus(id, status);
  if (ok) {
    revalidatePath("/admin/ticket-sales");
  }
}
