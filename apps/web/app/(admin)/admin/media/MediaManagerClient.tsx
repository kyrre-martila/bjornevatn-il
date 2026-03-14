"use client";

import * as React from "react";
import type { AdminMedia } from "../../../../lib/admin/media";

export function MediaManagerClient({
  initialMedia,
  pageSize,
}: {
  initialMedia: AdminMedia[];
  pageSize: number;
}) {
  const [media, setMedia] = React.useState(initialMedia);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialMedia.length >= pageSize);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/admin/media?offset=0&limit=${pageSize}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to refresh media");
    }

    const next = (await res.json()) as AdminMedia[];
    setMedia(next);
    setHasMore(next.length >= pageSize);
  }

  async function loadMore() {
    setLoadingMore(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/media?offset=${media.length}&limit=${pageSize}`,
        { cache: "no-store" },
      );

      if (!res.ok) {
        throw new Error("Failed to load more media");
      }

      const nextBatch = (await res.json()) as AdminMedia[];
      if (nextBatch.length === 0) {
        setHasMore(false);
        return;
      }

      setMedia((current) => [...current, ...nextBatch]);
      setHasMore(nextBatch.length >= pageSize);
    } catch {
      setError("Unable to load more media.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const alt = formData.get("alt");

    if (!(file instanceof File) || !file.name) {
      setError("Please choose a file before uploading.");
      return;
    }

    if (typeof alt !== "string" || !alt.trim()) {
      setError(
        "Please add alt text so clients using screen readers can understand the image.",
      );
      return;
    }

    setUploading(true);
    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          (data && (data.message || data.error)) || "Unable to upload media.",
        );
        return;
      }

      form.reset();
      await refresh();
    } catch {
      setError("Network error while uploading media.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    const confirmation = window.prompt(
      "To permanently delete this media item, type DELETE.",
    );
    if (confirmation !== "DELETE") {
      setError("Delete cancelled. The media item is unchanged.");
      return;
    }

    setError(null);
    const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Unable to delete media.");
      return;
    }

    setMedia((current) => current.filter((item) => item.id !== id));
  }

  async function onUpdateAlt(id: string, alt: string) {
    if (!alt.trim()) {
      setError(
        "Alt text cannot be empty. Please describe the image in plain language.",
      );
      return;
    }

    const res = await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alt }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        (data && (data.message || data.error)) || "Unable to update alt text.",
      );
      return;
    }

    const updated = (await res.json()) as AdminMedia;
    setMedia((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
  }

  return (
    <section className="media-manager">
      <h1>Media library</h1>

      <form onSubmit={onUpload} className="media-manager__upload">
        <input name="file" type="file" required />
        <input name="alt" placeholder="Alt text" required />
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {error ? <p className="page-editor__error">{error}</p> : null}

      <div className="media-manager__grid">
        {media.map((item) => (
          <article key={item.id} className="media-manager__item">
            <div className="media-manager__preview">
              <img
                src={item.url}
                alt={item.alt || "Image"}
                loading="lazy"
                width={item.width ?? undefined}
                height={item.height ?? undefined}
              />
            </div>
            <p className="media-manager__date">
              Uploaded: {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="media-manager__date">
              {item.mimeType || "unknown type"} • {item.width ?? "?"}×
              {item.height ?? "?"} • {item.sizeBytes ?? 0} bytes
            </p>
            <label>
              Alt text {item.isUsed ? "*" : ""}
              <input
                defaultValue={item.alt}
                required={item.isUsed}
                onBlur={(e) => {
                  const nextAlt = e.target.value.trim();
                  if (nextAlt !== item.alt) {
                    void onUpdateAlt(item.id, nextAlt);
                  }
                }}
              />
            </label>
            <button type="button" onClick={() => onDelete(item.id)}>
              Delete
            </button>
          </article>
        ))}
      </div>

      {hasMore ? (
        <button type="button" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
