"use client";

import * as React from "react";
import { DestructiveConfirmModal } from "../components/DestructiveConfirmModal";
import type { StagingStatus } from "../../../../lib/admin/staging";

type Props = {
  canTriggerActions: boolean;
  initialStatus: StagingStatus | null;
};

type ActionName = "reset" | "push" | "delete";

const ACTION_COPY: Record<ActionName, string> = {
  reset: "Reset staging from live",
  push: "Push staging to live",
  delete: "Delete staging",
};

const ACTION_SUMMARY: Record<ActionName, string> = {
  reset:
    "This will overwrite the entire staging database and staging uploads with the current live environment.",
  push:
    "This will overwrite the live environment with the current staging database and uploads.",
  delete: "This will permanently remove the staging environment.",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatStateLabel(status: StagingStatus | null): string {
  if (!status) return "Unknown";
  if (status.state === "deleted") return "Not found";
  return "Exists";
}

export function StagingControlsClient({ canTriggerActions, initialStatus }: Props) {
  const [status, setStatus] = React.useState<StagingStatus | null>(initialStatus);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<ActionName | null>(null);
  const [confirmingAction, setConfirmingAction] = React.useState<ActionName | null>(null);

  const operationInProgress = busyAction !== null || status?.lockStatus === "locked";
  const destructiveDisabled = operationInProgress;

  async function runAction(action: ActionName) {
    setMessage(null);
    setError(null);
    setBusyAction(action);

    try {
      const route =
        action === "reset"
          ? "/api/admin/staging/reset"
          : action === "push"
            ? "/api/admin/staging/push-live"
            : "/api/admin/staging";
      const method = action === "delete" ? "DELETE" : "POST";
      const payload = action === "push" ? { confirmPushToLive: true } : undefined;
      const res = await fetch(route, {
        method,
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
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

      setMessage(`${ACTION_COPY[action]} completed.`);
    } catch {
      setError("Network error while running staging action.");
    } finally {
      setBusyAction(null);
      setConfirmingAction(null);
    }
  }

  const warning =
    status?.lockStatus === "locked"
      ? "Operation in progress"
      : status?.state === "deleted"
        ? "Staging environment does not currently exist."
        : null;

  return (
    <div className="page-editor" style={{ marginTop: 24 }}>
      {error && <p className="page-editor__error">{error}</p>}
      {message && <p className="page-editor__status">{message}</p>}

      <div className="admin-pages__list" role="list" aria-label="Staging status details">
        <article className="admin-pages__item" role="listitem">
          <div className="admin-pages__item-main">
            <h2>Environment status</h2>
            <p className="admin-pages__help">Staging environment: {formatStateLabel(status)}</p>
            <p className="admin-pages__help">Current lock state: {status?.lockStatus ?? "unknown"}</p>
            <p className="admin-pages__help">Last reset from live: {formatDate(status?.lastResetAt ?? null)}</p>
            <p className="admin-pages__help">Last push to live: {formatDate(status?.lastPushedAt ?? null)}</p>
            <p className="admin-pages__help">Last actor: {status?.lastActorUserId ?? "Unknown"}</p>
            <p className="admin-pages__help">Current warning: {warning ?? "None"}</p>
          </div>
        </article>

        <article className="admin-pages__item" role="listitem">
          <div className="admin-pages__item-main">
            <h2>Actions</h2>
            <p className="admin-pages__help">
              {canTriggerActions
                ? "Run staging management actions. Destructive operations require confirmation."
                : "Destructive staging actions are restricted to super admins."}
            </p>
            {operationInProgress ? (
              <p className="admin-pages__help">Operation in progress</p>
            ) : null}
          </div>
          {canTriggerActions ? (
            <div className="admin-pages__item-actions">
              <button
                className="btn btn--secondary"
                onClick={() => setConfirmingAction("reset")}
                disabled={destructiveDisabled}
              >
                {busyAction === "reset" ? "Working..." : ACTION_COPY.reset}
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => setConfirmingAction("push")}
                disabled={destructiveDisabled}
              >
                {busyAction === "push" ? "Working..." : ACTION_COPY.push}
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => setConfirmingAction("delete")}
                disabled={destructiveDisabled}
              >
                {busyAction === "delete" ? "Working..." : ACTION_COPY.delete}
              </button>
            </div>
          ) : null}
        </article>
      </div>

      <DestructiveConfirmModal
        open={confirmingAction !== null}
        title={
          confirmingAction ? `${ACTION_COPY[confirmingAction]}?` : "Confirm staging operation"
        }
        description={confirmingAction ? ACTION_SUMMARY[confirmingAction] : ""}
        confirmLabel={confirmingAction ? ACTION_COPY[confirmingAction] : "Confirm"}
        details={
          confirmingAction
            ? [
                { label: "Action", value: ACTION_COPY[confirmingAction] },
                { label: "Impact", value: ACTION_SUMMARY[confirmingAction] },
              ]
            : []
        }
        isProcessing={busyAction !== null}
        onCancel={() => setConfirmingAction(null)}
        onConfirm={() => {
          if (confirmingAction) {
            void runAction(confirmingAction);
          }
        }}
      />
    </div>
  );
}
