"use client";

import * as React from "react";
import type { StagingStatus } from "../../../../lib/admin/staging";

type Props = {
  canTriggerActions: boolean;
  initialStatus: StagingStatus | null;
};

type ActionName = "login" | "reset" | "push" | "delete";

const ACTION_COPY: Record<ActionName, string> = {
  login: "Log into staging",
  reset: "Reset staging from live",
  push: "Push staging to live",
  delete: "Delete staging",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function StagingControlsClient({ canTriggerActions, initialStatus }: Props) {
  const [status, setStatus] = React.useState<StagingStatus | null>(initialStatus);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<ActionName | null>(null);

  async function runAction(action: ActionName) {
    setMessage(null);
    setError(null);
    setBusyAction(action);

    try {
      const route =
        action === "login"
          ? "/api/admin/staging/login"
          : action === "reset"
            ? "/api/admin/staging/reset"
            : action === "push"
              ? "/api/admin/staging/push-live"
              : "/api/admin/staging";
      const method = action === "delete" ? "DELETE" : "POST";
      const res = await fetch(route, { method });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const responseMessage =
          (data && (data.message || data.error)) ||
          "This staging action is not allowed for your role.";
        setError(
          typeof responseMessage === "string"
            ? responseMessage
            : "This staging action is not allowed for your role.",
        );
        return;
      }

      if (data && typeof data === "object" && "environment" in data) {
        setStatus(data as StagingStatus);
      }

      if (action === "login") {
        setMessage("Staging login granted. You can now access the staging site.");
      } else {
        setMessage(`${ACTION_COPY[action]} completed.`);
      }
    } catch {
      setError("Network error while running staging action.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="page-editor" style={{ marginTop: 24 }}>
      {error && <p className="page-editor__error">{error}</p>}
      {message && <p className="page-editor__status">{message}</p>}

      <div className="admin-pages__list" role="list" aria-label="Staging status details">
        <article className="admin-pages__item" role="listitem">
          <div className="admin-pages__item-main">
            <h2>Staging status</h2>
            <p className="admin-pages__help">Current state: {status?.state ?? "unknown"}</p>
            <p className="admin-pages__help">Last synced: {formatDate(status?.lastSyncedAt ?? null)}</p>
            <p className="admin-pages__help">Last pushed live: {formatDate(status?.lastPushedAt ?? null)}</p>
            <p className="admin-pages__help">Last reset: {formatDate(status?.lastResetAt ?? null)}</p>
          </div>
          <div className="admin-pages__item-actions">
            <button
              className="btn btn--secondary"
              onClick={() => void runAction("login")}
              disabled={busyAction !== null}
            >
              {busyAction === "login" ? "Working..." : ACTION_COPY.login}
            </button>
          </div>
        </article>

        {canTriggerActions ? (
          <>
            <article className="admin-pages__item" role="listitem">
              <div className="admin-pages__item-main">
                <h2>Reset staging from live</h2>
                <p className="admin-pages__help">Replace staging data with a fresh snapshot from live.</p>
              </div>
              <div className="admin-pages__item-actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => void runAction("reset")}
                  disabled={busyAction !== null}
                >
                  {busyAction === "reset" ? "Working..." : ACTION_COPY.reset}
                </button>
              </div>
            </article>

            <article className="admin-pages__item" role="listitem">
              <div className="admin-pages__item-main">
                <h2>Push staging to live</h2>
                <p className="admin-pages__help">Promote validated staging content to production.</p>
              </div>
              <div className="admin-pages__item-actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => void runAction("push")}
                  disabled={busyAction !== null}
                >
                  {busyAction === "push" ? "Working..." : ACTION_COPY.push}
                </button>
              </div>
            </article>

            <article className="admin-pages__item" role="listitem">
              <div className="admin-pages__item-main">
                <h2>Delete staging</h2>
                <p className="admin-pages__help">Remove the staging environment and all staged artifacts.</p>
              </div>
              <div className="admin-pages__item-actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => void runAction("delete")}
                  disabled={busyAction !== null}
                >
                  {busyAction === "delete" ? "Working..." : ACTION_COPY.delete}
                </button>
              </div>
            </article>
          </>
        ) : (
          <article className="admin-pages__item" role="listitem">
            <div className="admin-pages__item-main">
              <h2>Restricted actions</h2>
              <p className="admin-pages__help">
                Reset, push, and delete actions are restricted to superadmins.
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
