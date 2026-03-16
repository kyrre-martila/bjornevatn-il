"use client";

import * as React from "react";

type Props = {
  canRunActions: boolean;
};

type ActionName = "reset" | "push";

const ACTION_COPY: Record<ActionName, string> = {
  reset: "Reset from live",
  push: "Push to live",
};

export function StagingBannerActions({ canRunActions }: Props) {
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<ActionName | null>(null);

  if (!canRunActions) return null;

  async function runAction(action: ActionName) {
    setMessage(null);
    setError(null);
    setBusyAction(action);

    try {
      const route = action === "reset" ? "/api/admin/staging/reset" : "/api/admin/staging/push-live";
      const payload = action === "push" ? { confirmPushToLive: true } : undefined;
      const res = await fetch(route, {
        method: "POST",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const responseMessage = (data && (data.message || data.error)) || "Action failed.";
        setError(typeof responseMessage === "string" ? responseMessage : "Action failed.");
        return;
      }

      setMessage(`${ACTION_COPY[action]} completed.`);
    } catch {
      setError("Network error while running staging action.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="staging-banner__actions">
      <button
        className="staging-banner__button"
        type="button"
        disabled={busyAction !== null}
        onClick={() => void runAction("reset")}
      >
        {busyAction === "reset" ? "Working..." : ACTION_COPY.reset}
      </button>
      <button
        className="staging-banner__button"
        type="button"
        disabled={busyAction !== null}
        onClick={() => void runAction("push")}
      >
        {busyAction === "push" ? "Working..." : ACTION_COPY.push}
      </button>
      {message ? <span className="staging-banner__status">{message}</span> : null}
      {error ? <span className="staging-banner__error">{error}</span> : null}
    </div>
  );
}
