"use client";

import * as React from "react";
import type { AdminMedia, AdminMediaPagination } from "../../../../lib/admin/media";
import { DestructiveConfirmModal } from "../components/DestructiveConfirmModal";
import { ImageAsset } from "../../../../components/media/ImageAsset";

export function MediaManagerClient({
  initialMedia,
  pageSize,
  initialPagination,
  canDeleteMedia,
}: {
  initialMedia: AdminMedia[];
  pageSize: number;
  initialPagination: AdminMediaPagination;
  canDeleteMedia: boolean;
}) {
  const [media, setMedia] = React.useState(initialMedia);
  const [page, setPage] = React.useState(initialPagination.page);
  const [loadingPage, setLoadingPage] = React.useState(false);
  const [pagination, setPagination] = React.useState(initialPagination);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<AdminMedia | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [mimeTypeFilter, setMimeTypeFilter] = React.useState<string>("");
  const [uploadedAfter, setUploadedAfter] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");

  async function loadPage(nextPage: number) {
    setLoadingPage(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      if (mimeTypeFilter) query.set("mimeType", mimeTypeFilter);
      if (uploadedAfter) query.set("uploadedAfter", uploadedAfter);
      if (search) query.set("search", search);

      const res = await fetch(`/api/admin/media?${query.toString()}`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Failed to load media page");
      }

      const batch = (await res.json()) as { items: AdminMedia[]; pagination: AdminMediaPagination };
      setMedia(batch.items);
      setPagination(batch.pagination);
      setPage(nextPage);
    } catch {
      setError("Unable to load media.");
    } finally {
      setLoadingPage(false);
    }
  }

  async function refresh() {
    await loadPage(0);
  }

  async function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");
    const altText = formData.get("altText");

    if (!(file instanceof File) || !file.name) {
      setError("Please choose a file before uploading.");
      return;
    }

    if (typeof altText !== "string" || !altText.trim()) {
      setError("Please add alt text for the uploaded image.");
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
        setError((data && (data.message || data.error)) || "Unable to upload media.");
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

  async function confirmDeleteMedia() {
    if (!pendingDelete) {
      return;
    }

    setError(null);
    setIsDeleting(true);
    const res = await fetch(`/api/admin/media/${pendingDelete.id}`, {
      method: "DELETE",
    });
    setIsDeleting(false);
    if (!res.ok) {
      setError("Unable to delete media.");
      return;
    }

    setPendingDelete(null);
    await loadPage(page);
  }

  async function onUpdateAsset(id: string, values: { altText?: string; caption?: string }) {
    const res = await fetch(`/api/admin/media/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError((data && (data.message || data.error)) || "Unable to update media metadata.");
      return;
    }

    const updated = (await res.json()) as AdminMedia;
    setMedia((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <section className="media-manager stack">
      <h1>Media library</h1>

      <form onSubmit={onUpload} className="media-manager__upload">
        <input name="file" type="file" accept="image/png,image/jpeg" required />
        <input name="altText" placeholder="Alt text" required />
        <input name="caption" placeholder="Caption (optional)" />
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>

      <div className="media-manager__filters">
        <label>
          Image type
          <select value={mimeTypeFilter} onChange={(e) => setMimeTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
          </select>
        </label>
        <label>
          Upload date (from)
          <input type="date" value={uploadedAfter} onChange={(e) => setUploadedAfter(e.target.value)} />
        </label>
        <label>
          Filename
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search filename" />
        </label>
        <button type="button" onClick={() => void loadPage(0)} disabled={loadingPage}>Apply filters</button>
      </div>

      {error ? <p className="page-editor__error">{error}</p> : null}

      <p>
        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>

      <div className="media-manager__grid">
        {media.length === 0 ? <p>No media found for current filters.</p> : null}
        {media.map((item) => (
          <article key={item.id} className="media-manager__item stack stack--sm">
            <ImageAsset asset={item} className="media-manager__preview" imageClassName="media-manager__image" />
            <p>{item.fileName}</p>
            <p className="media-manager__date">
              {item.mimeType || "unknown type"} • {item.width ?? "?"}×{item.height ?? "?"} • {item.fileSize ?? 0} bytes
            </p>
            <p className="media-manager__date">Uploaded: {new Date(item.createdAt).toLocaleString()}</p>
            <button type="button" onClick={() => void navigator.clipboard.writeText(item.url)}>Copy image URL</button>
            <label>
              Alt text
              <input
                defaultValue={item.altText ?? ""}
                onBlur={(e) => {
                  const nextAltText = e.target.value.trim();
                  if (nextAltText !== (item.altText ?? "")) {
                    void onUpdateAsset(item.id, { altText: nextAltText });
                  }
                }}
              />
            </label>
            <label>
              Caption
              <input
                defaultValue={item.caption ?? ""}
                onBlur={(e) => {
                  const nextCaption = e.target.value.trim();
                  if (nextCaption !== (item.caption ?? "")) {
                    void onUpdateAsset(item.id, { caption: nextCaption });
                  }
                }}
              />
            </label>
            {canDeleteMedia ? (
              <button type="button" onClick={() => setPendingDelete(item)}>
                Delete
              </button>
            ) : (
              <small>Only admins can delete media.</small>
            )}
          </article>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => void loadPage(Math.max(1, page - 1))}
          disabled={loadingPage || page === 1}
        >
          Previous page
        </button>
        <button
          type="button"
          onClick={() => void loadPage(page + 1)}
          disabled={loadingPage || page >= pagination.totalPages}
        >
          Next page
        </button>
      </div>

      <DestructiveConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete media item"
        description="This permanently removes the media file from the library. Any pages or entries using this URL may show broken images."
        confirmLabel="Delete media"
        confirmText="DELETE"
        details={
          pendingDelete
            ? [
                { label: "Alt text", value: pendingDelete.altText || "(none)" },
                { label: "Media URL", value: pendingDelete.url },
              ]
            : []
        }
        isProcessing={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteMedia()}
      />
    </section>
  );
}
