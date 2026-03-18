"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ScanValidationResult } from "../../lib/tickets";
import { confirmScanAction, validateScanAction } from "./actions";

type ScannerState = {
  result: ScanValidationResult | null;
};

const initialState: ScannerState = {
  result: null,
};

async function validateState(_: ScannerState, formData: FormData) {
  return { result: await validateScanAction(formData) };
}

async function confirmState(_: ScannerState, formData: FormData) {
  return { result: await confirmScanAction(formData) };
}

export default function ScannerClient() {
  const [qrValue, setQrValue] = useState("");
  const [validateData, validateFormAction] = useFormState(
    validateState,
    initialState,
  );
  const [confirmData, confirmFormAction] = useFormState(
    confirmState,
    initialState,
  );

  const result = confirmData.result ?? validateData.result;

  return (
    <div className="scanner-page__card stack stack--sm">
      <h1 className="scanner-page__title">Ticket scanner</h1>
      <p className="scanner-page__intro">
        Camera scanner is not enabled yet in this repo. Use QR payload input below.
      </p>

      <form action={validateFormAction} className="scanner-page__form stack stack--sm">
        <label htmlFor="qrCodeValue" className="scanner-page__label">
          QR value
        </label>
        <input
          id="qrCodeValue"
          name="qrCodeValue"
          value={qrValue}
          onChange={(event) => setQrValue(event.target.value)}
          className="scanner-page__input"
          placeholder="bil.v1..."
          required
        />
        <button type="submit" className="button-primary">
          Validate ticket
        </button>
      </form>

      {result ? (
        <section className={`scanner-page__result scanner-page__result--${result.reason}`}>
          <h2 className="scanner-page__result-title">Validation result: {result.reason}</h2>
          {result.ticket ? (
            <dl className="scanner-page__meta">
              <dt>Buyer</dt>
              <dd>{result.ticket.buyerName}</dd>
              <dt>Ticket type</dt>
              <dd>{result.ticket.ticketType}</dd>
              <dt>Order</dt>
              <dd>{result.ticket.orderReference}</dd>
              <dt>Scan count</dt>
              <dd>{result.scanCount}</dd>
            </dl>
          ) : (
            <p>No matching ticket found.</p>
          )}

          {result.match ? (
            <p>
              Match: {String(result.match.data.homeTeam ?? "")} vs {String(result.match.data.awayTeam ?? "")} ·{" "}
              {new Date(String(result.match.data.matchDate ?? "")).toLocaleString("no-NO")}
            </p>
          ) : null}

          {result.ticket ? (
            <form action={confirmFormAction} className="scanner-page__confirm cluster">
              <input type="hidden" name="qrCodeValue" value={qrValue} />
              <button type="submit" className="button-primary">
                Confirm entry
              </button>
              {result.reason === "already-used" ? (
                <button
                  type="submit"
                  className="button-secondary"
                  name="allowOverride"
                  value="1"
                >
                  Allow entry anyway
                </button>
              ) : null}
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
