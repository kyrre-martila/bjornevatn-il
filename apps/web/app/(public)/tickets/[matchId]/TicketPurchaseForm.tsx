"use client";

import { useMemo, useState } from "react";

type TicketType = {
  name: string;
  description?: string;
  price: number;
  maxPerOrder: number;
  totalAvailable: number;
  remaining: number;
};

export default function TicketPurchaseForm({
  ticketTypes,
}: {
  ticketTypes: TicketType[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selection = useMemo(
    () =>
      ticketTypes.map((type) => ({
        ticketType: type.name,
        quantity: quantities[type.name] ?? 0,
      })),
    [quantities, ticketTypes],
  );

  return (
    <>
      <input
        type="hidden"
        name="selections"
        value={JSON.stringify(selection)}
      />
      <div className="ticket-purchase__types">
        {ticketTypes.map((type) => {
          const maxValue = Math.min(type.maxPerOrder, type.remaining);
          return (
            <fieldset key={type.name} className="ticket-purchase__type">
              <legend>{type.name}</legend>
              <p>{type.description}</p>
              <p>{type.price} NOK</p>
              <label>
                Quantity
                <input
                  type="number"
                  min={0}
                  max={maxValue}
                  value={quantities[type.name] ?? 0}
                  onChange={(event) =>
                    setQuantities((previous) => ({
                      ...previous,
                      [type.name]: Math.max(
                        0,
                        Math.min(maxValue, Number(event.target.value || 0)),
                      ),
                    }))
                  }
                />
              </label>
            </fieldset>
          );
        })}
      </div>

      <div className="ticket-purchase__buyer">
        <label>
          Full name
          <input required name="buyerName" type="text" />
        </label>
        <label>
          Email
          <input required name="buyerEmail" type="email" />
        </label>
        <label>
          Phone
          <input required name="buyerPhone" type="tel" />
        </label>
      </div>
    </>
  );
}
