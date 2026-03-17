"use client";

import * as React from "react";
import type { AdminMedia } from "../../lib/admin/media";
import { ImageAsset } from "./ImageAsset";

type MediaPickerProps = {
  value: string | null;
  media: AdminMedia[];
  onChange: (mediaId: string | null) => void;
  onUploaded?: (asset: AdminMedia) => void;
};

export function MediaPicker({ value, media, onChange, onUploaded }: MediaPickerProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const selected = media.find((item) => item.id === value) ?? null;

  async function uploadNew(formData: FormData) {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload) {
        setError((payload && (payload.error || payload.message)) || "Upload failed.");
        return;
      }
      const created = payload as AdminMedia;
      onUploaded?.(created);
      onChange(created.id);
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="media-picker stack stack--sm">
      <label className="media-picker__field">
        <span>Choose media asset</span>
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">No asset selected</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>{item.fileName}</option>
          ))}
        </select>
      </label>

      <form
        className="media-picker__upload"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          void uploadNew(fd);
        }}
      >
        <input type="file" name="file" required />
        <input type="text" name="altText" placeholder="Alt text" required />
        <button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload new"}</button>
      </form>

      {selected ? <ImageAsset asset={selected} className="media-picker__preview" /> : null}
      {error ? <p className="page-editor__error">{error}</p> : null}
    </div>
  );
}
