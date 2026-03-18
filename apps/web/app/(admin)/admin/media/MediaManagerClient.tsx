"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";

import { ImageAsset } from "../../../../components/media/ImageAsset";
import type {
  AdminMedia,
  AdminMediaPagination,
} from "../../../../lib/admin/media";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { DestructiveConfirmModal } from "../components/DestructiveConfirmModal";

type MediaManagerClientProps = {
  initialMedia: AdminMedia[];
  initialPagination: AdminMediaPagination;
  pageSize: number;
  canDeleteMedia: boolean;
};

export function MediaManagerClient({
  initialMedia,
  initialPagination,
  pageSize,
  canDeleteMedia,
}: MediaManagerClientProps) {
  const [media, setMedia] = useState(initialMedia);
  const [pagination, setPagination] = useState(initialPagination);
  const [page, setPage] = useState(initialPagination.page);
  const [mimeTypeFilter, setMimeTypeFilter] = useState("");
  const [uploadedAfter, setUploadedAfter] = useState("");
  const [search, setSearch] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminMedia | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasActiveFilters = useMemo(
    () => Boolean(mimeTypeFilter || uploadedAfter || search.trim()),
    [mimeTypeFilter, search, uploadedAfter],
  );

  const buildQuery = useCallback(
    (nextPage: number) => {
      const query = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      });

      if (mimeTypeFilter) {
        query.set("mimeType", mimeTypeFilter);
      }
      if (uploadedAfter) {
        query.set("uploadedAfter", uploadedAfter);
      }
      if (search.trim()) {
        query.set("search", search.trim());
      }

      return query;
    },
    [mimeTypeFilter, pageSize, search, uploadedAfter],
  );

  const loadPage = useCallback(
    async (requestedPage: number) => {
      setLoadingPage(true);
      setError(null);
      setFeedback(null);
      try {
        const response = await fetch(`/api/admin/media?${buildQuery(requestedPage).toString()}`);
        if (!response.ok) {
          setError("Unable to load media.");
          return;
        }

        const data = (await response.json()) as {
          items: AdminMedia[];
          pagination: AdminMediaPagination;
        };
        setMedia(data.items);
        setPagination(data.pagination);
        setPage(data.pagination.page);
      } catch {
        setError("Network error while loading media.");
      } finally {
        setLoadingPage(false);
      }
    },
    [buildQuery],
  );

  async function refresh() {
    await loadPage(page);
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    setUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

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
      setFeedback("Media uploaded.");
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
    setFeedback(null);
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
    setFeedback("Media deleted.");
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
    setFeedback("Media details updated.");
  }

  return (
    <section className="admin-list-page media-manager">
      <AdminPageHeader
        title="Media library"
        description="Upload, filter, and maintain reusable image assets using the same list, empty state, and action conventions as the rest of admin."
      />

      <AdminSectionCard title="Upload media" description="Add a new image and set the required accessibility text up front.">
        <form onSubmit={onUpload} className="admin-form-panel">
          <div className="admin-form-panel__grid">
            <label className="admin-form-panel__field">
              <span>Image file</span>
              <input name="file" type="file" accept="image/png,image/jpeg" required />
            </label>
            <label className="admin-form-panel__field">
              <span>Alt text</span>
              <input name="altText" required />
            </label>
            <label className="admin-form-panel__field admin-form-panel__field--full">
              <span>Caption</span>
              <input name="caption" placeholder="Optional caption" />
            </label>
          </div>
          <div className="admin-form-actions">
            <button type="submit" className="button-primary" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload media"}
            </button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Filters" description="Narrow the library by type, upload date, or filename.">
        <div className="admin-filters-bar">
          <div className="admin-filters-bar__fields">
            <label className="admin-filters-bar__field">
              <span>Image type</span>
              <select value={mimeTypeFilter} onChange={(e) => setMimeTypeFilter(e.target.value)}>
                <option value="">All types</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>
            <label className="admin-filters-bar__field">
              <span>Upload date (from)</span>
              <input type="date" value={uploadedAfter} onChange={(e) => setUploadedAfter(e.target.value)} />
            </label>
            <label className="admin-filters-bar__field">
              <span>Filename</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search filename" />
            </label>
          </div>
          <div className="admin-filters-bar__actions">
            <button type="button" className="button-primary" onClick={() => void loadPage(1)} disabled={loadingPage}>
              Apply filters
            </button>
          </div>
        </div>
      </AdminSectionCard>

      {error ? <p className="admin-form-feedback admin-form-feedback--error">{error}</p> : null}
      {feedback ? <p className="admin-form-feedback admin-form-feedback--success">{feedback}</p> : null}

      <AdminSectionCard title="Assets" description="Each asset card includes preview details, editable metadata, and copy or delete actions.">
        {media.length === 0 ? (
          <AdminEmptyState
            title={hasActiveFilters ? "No media matches these filters" : "No media uploaded yet"}
            description={
              hasActiveFilters
                ? "Adjust or clear the current filters to see more assets."
                : "Upload an image above to start building the shared media library."
            }
          />
        ) : (
          <div className="media-manager__grid">
            {media.map((item) => (
              <article key={item.id} className="media-manager__item admin-card-list__item">
                <ImageAsset
                  asset={item}
                  className="media-manager__preview"
                  imageClassName="media-manager__image"
                />
                <div className="admin-card-list__row">
                  <div>
                    <h2 className="admin-card-list__title">{item.fileName}</h2>
                    <p className="admin-card-list__meta">{item.originalName}</p>
                  </div>
                </div>
                <dl className="admin-key-value-list">
                  <div>
                    <dt>File details</dt>
                    <dd>
                      {item.mimeType || "Unknown type"} • {item.width ?? "?"}×{item.height ?? "?"} • {item.fileSize ?? 0} bytes
                    </dd>
                  </div>
                  <div>
                    <dt>Uploaded</dt>
                    <dd>{new Date(item.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className="admin-inline-actions">
                  <button type="button" onClick={() => void navigator.clipboard.writeText(item.url)}>
                    Copy image URL
                  </button>
                  {canDeleteMedia ? (
                    <button type="button" onClick={() => setPendingDelete(item)}>
                      Delete media
                    </button>
                  ) : (
                    <span className="admin-table-help">Only admins can delete media.</span>
                  )}
                </div>
                <div className="admin-form-panel__grid">
                  <label className="admin-form-panel__field">
                    <span>Alt text</span>
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
                  <label className="admin-form-panel__field">
                    <span>Caption</span>
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
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        basePath="/admin/media"
        query={{
          pageSize: String(pageSize),
          mimeType: mimeTypeFilter || undefined,
          uploadedAfter: uploadedAfter || undefined,
          search: search.trim() || undefined,
        }}
        ariaLabel="Media library pages"
      />

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
