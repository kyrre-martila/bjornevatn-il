"use server";

import { redirect } from "next/navigation";

function getApiBase() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";
  const normalizedBase = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  return `${api}${normalizedBase}`;
}

export async function submitTicketOrder(matchId: string, formData: FormData) {
  const selectionsRaw = String(formData.get("selections") ?? "[]");

  const payload = {
    matchId,
    buyerName: String(formData.get("buyerName") ?? ""),
    buyerEmail: String(formData.get("buyerEmail") ?? ""),
    buyerPhone: String(formData.get("buyerPhone") ?? ""),
    selections: JSON.parse(selectionsRaw) as Array<{
      ticketType: string;
      quantity: number;
    }>,
  };

  const response = await fetch(`${getApiBase()}/tickets/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(`/tickets/${matchId}?error=unavailable`);
  }

  const data = (await response.json()) as { orderReference: string };
  redirect(
    `/tickets/${matchId}?orderReference=${encodeURIComponent(data.orderReference)}`,
  );
}
