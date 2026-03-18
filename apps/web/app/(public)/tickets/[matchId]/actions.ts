"use server";

import { redirect } from "next/navigation";
import { getServerApiBaseUrl } from "../../../../lib/api-config";

function getApiBase() {
  return getServerApiBaseUrl();
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

  const data = (await response.json()) as {
    orderReference: string;
    orderLookupToken: string;
  };
  redirect(
    `/tickets/${matchId}/confirmation?reference=${encodeURIComponent(data.orderReference)}&token=${encodeURIComponent(data.orderLookupToken)}`,
  );
}
