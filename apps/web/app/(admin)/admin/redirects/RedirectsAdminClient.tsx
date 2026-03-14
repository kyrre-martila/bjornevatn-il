"use client";

import * as React from "react";

import type { AdminRedirect } from "../../../../lib/admin/redirects";

type RedirectFormState = {
  fromPath: string;
  toPath: string;
  statusCode: "301" | "302";
};

const EMPTY_FORM: RedirectFormState = {
  fromPath: "",
  toPath: "",
  statusCode: "301",
};

export function RedirectsAdminClient({
  initialRedirects,
}: {
  initialRedirects: AdminRedirect[];
}) {
  const [redirects, setRedirects] = React.useState(initialRedirects);
  const [form, setForm] = React.useState<RedirectFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editRedirect(item: AdminRedirect) {
    setEditingId(item.id);
    setForm({
      fromPath: item.fromPath,
      toPath: item.toPath,
      statusCode: String(item.statusCode) as "301" | "302",
    });
    setError(null);
    setStatus(null);
  }

  async function reloadRedirects() {
    const res = await fetch("/api/admin/redirects", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => []);

    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Unable to refresh redirects.");
    }

    setRedirects(data as AdminRedirect[]);
  }

  function validateForm(): {
    fromPath: string;
    toPath: string;
    statusCode: 301 | 302;
  } | null {
    const fromPath = form.fromPath.trim();
    const toPath = form.toPath.trim();

    if (!fromPath || !toPath) {
      setError("From path and to path are required.");
      return null;
    }

    if (!fromPath.startsWith("/") || !toPath.startsWith("/")) {
      setError("Both paths must start with '/'.");
      return null;
    }

    if (fromPath.includes("://") || toPath.includes("://")) {
      setError("Only internal paths are allowed.");
      return null;
    }

    return {
      fromPath,
      toPath,
      statusCode: Number(form.statusCode) as 301 | 302,
    };
  }

  async function saveRedirect(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setStatus(null);

    const payload = validateForm();
    if (!payload) {
      return;
    }

    setIsSaving(true);

    try {
      const endpoint = editingId
        ? `/api/admin/redirects/${editingId}`
        : "/api/admin/redirects";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.message || data.error)) || "Unable to save redirect.";
        setError(
          typeof message === "string" ? message : "Unable to save redirect.",
        );
        return;
      }

      await reloadRedirects();
      setStatus(editingId ? "Redirect updated." : "Redirect created.");
      resetForm();
    } catch {
      setError("Network error while saving redirect.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRedirect(id: string) {
    if (!window.confirm("Delete this redirect?")) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const res = await fetch(`/api/admin/redirects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Unable to delete redirect.");
        return;
      }

      await reloadRedirects();
      if (editingId === id) {
        resetForm();
      }
      setStatus("Redirect deleted.");
    } catch {
      setError("Network error while deleting redirect.");
    }
  }

  const sortedRedirects = React.useMemo(
    () =>
      [...redirects].sort((a, b) =>
        a.fromPath.localeCompare(b.fromPath, undefined, {
          sensitivity: "base",
        }),
      ),
    [redirects],
  );

  return (
    <section className="page-editor" aria-labelledby="redirects-heading">
      <div className="page-editor__header">
        <p className="hero__eyebrow">Content</p>
        <h1 id="redirects-heading">Redirects</h1>
        <p>Manage path redirects for legacy URLs and moved content.</p>
      </div>

      <form className="page-editor__form" onSubmit={saveRedirect}>
        <label>
          From path
          <input
            value={form.fromPath}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fromPath: event.target.value,
              }))
            }
            placeholder="/old-path"
          />
        </label>

        <label>
          To path
          <input
            value={form.toPath}
            onChange={(event) =>
              setForm((current) => ({ ...current, toPath: event.target.value }))
            }
            placeholder="/new-path"
          />
        </label>

        <label>
          Status code
          <select
            value={form.statusCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                statusCode: event.target.value as "301" | "302",
              }))
            }
          >
            <option value="301">301 (Permanent)</option>
            <option value="302">302 (Temporary)</option>
          </select>
        </label>

        {error && <p className="page-editor__error">{error}</p>}
        {status && <p className="page-editor__status">{status}</p>}

        <div className="page-editor__actions">
          <button type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving…"
              : editingId
                ? "Update redirect"
                : "Create redirect"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-list" role="list" aria-label="Redirect list">
        {sortedRedirects.map((item) => (
          <article key={item.id} className="admin-list__item" role="listitem">
            <div>
              <strong>{item.fromPath}</strong>
              <p>
                {item.statusCode} → {item.toPath}
              </p>
            </div>
            <div className="page-editor__block-toolbar">
              <button type="button" onClick={() => editRedirect(item)}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => void deleteRedirect(item.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}

        {sortedRedirects.length === 0 ? (
          <p>No redirects configured yet.</p>
        ) : null}
      </div>
    </section>
  );
}
