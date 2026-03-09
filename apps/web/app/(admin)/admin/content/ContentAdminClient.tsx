"use client";

import * as React from "react";
import type { AdminContentItem, AdminContentType } from "../../../../lib/admin/content";

type Props = {
  initialContentTypes: AdminContentType[];
  initialGroupedItems: Array<{ contentTypeId: string; items: AdminContentItem[] }>;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ContentAdminClient({ initialContentTypes, initialGroupedItems }: Props) {
  const [contentTypes, setContentTypes] = React.useState(initialContentTypes);
  const [itemsByType, setItemsByType] = React.useState(() => new Map(initialGroupedItems.map((entry) => [entry.contentTypeId, entry.items])));
  const [selectedTypeId, setSelectedTypeId] = React.useState(initialContentTypes[0]?.id ?? "");
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedType = contentTypes.find((type) => type.id === selectedTypeId) ?? null;
  const selectedItems = selectedType ? itemsByType.get(selectedType.id) ?? [] : [];

  async function refreshItems(contentTypeId: string) {
    const res = await fetch(`/api/admin/content-items?contentTypeId=${encodeURIComponent(contentTypeId)}`, { cache: "no-store" });
    if (!res.ok) return;
    const items = (await res.json()) as AdminContentItem[];
    setItemsByType((curr) => new Map(curr).set(contentTypeId, items));
  }

  async function saveContentType(formData: FormData) {
    setError(null); setStatus(null);
    const id = String(formData.get("id") ?? "");
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      slug: normalizeSlug(String(formData.get("slug") ?? "")),
      description: String(formData.get("description") ?? "").trim(),
    };

    const res = await fetch(id ? `/api/admin/content-types/${id}` : "/api/admin/content-types", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Unable to save content type.");
      return;
    }

    const next = (await res.json()) as AdminContentType;
    setContentTypes((curr) => {
      const exists = curr.some((entry) => entry.id === next.id);
      return exists ? curr.map((entry) => (entry.id === next.id ? next : entry)) : [next, ...curr];
    });
    setSelectedTypeId(next.id);
    setStatus("Content type saved.");
  }

  async function deleteContentType(id: string) {
    setError(null); setStatus(null);
    const res = await fetch(`/api/admin/content-types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Unable to delete content type. Delete all content items first.");
      return;
    }

    setContentTypes((curr) => curr.filter((entry) => entry.id !== id));
    setItemsByType((curr) => {
      const next = new Map(curr);
      next.delete(id);
      return next;
    });
    setSelectedTypeId((current) => (current === id ? "" : current));
    setStatus("Content type deleted.");
  }

  async function saveContentItem(formData: FormData) {
    if (!selectedType) return;
    setError(null); setStatus(null);

    const id = String(formData.get("id") ?? "");
    const dataRaw = String(formData.get("data") ?? "{}");
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(dataRaw) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
      data = parsed as Record<string, unknown>;
    } catch {
      setError("Content item data must be valid JSON object.");
      return;
    }

    const payload = {
      contentTypeId: selectedType.id,
      slug: normalizeSlug(String(formData.get("slug") ?? "")),
      title: String(formData.get("title") ?? "").trim(),
      published: formData.get("published") === "on",
      data,
    };

    const res = await fetch(id ? `/api/admin/content-items/${id}` : "/api/admin/content-items", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError("Unable to save content item.");
      return;
    }

    await refreshItems(selectedType.id);
    setStatus("Content item saved.");
  }

  async function deleteContentItem(id: string) {
    if (!selectedType) return;
    setError(null); setStatus(null);
    const res = await fetch(`/api/admin/content-items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Unable to delete content item.");
      return;
    }

    await refreshItems(selectedType.id);
    setStatus("Content item deleted.");
  }

  return (
    <section className="admin-pages">
      <h1 className="hero__title">Content types and content items</h1>
      {error && <p>{error}</p>}
      {status && <p>{status}</p>}

      <h2>Content types</h2>
      {contentTypes.map((type) => (
        <form key={type.id} action={saveContentType}>
          <input type="hidden" name="id" defaultValue={type.id} />
          <input name="name" defaultValue={type.name} placeholder="Name" required />
          <input name="slug" defaultValue={type.slug} placeholder="slug" required />
          <input name="description" defaultValue={type.description} placeholder="Description" required />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setSelectedTypeId(type.id)}>Items</button>
          <button type="button" onClick={() => void deleteContentType(type.id)}>Delete</button>
        </form>
      ))}

      <h3>Create content type</h3>
      <form action={saveContentType}>
        <input name="name" placeholder="Name" required />
        <input name="slug" placeholder="slug" required />
        <input name="description" placeholder="Description" required />
        <button type="submit">Create</button>
      </form>

      {selectedType && (
        <>
          <h2>Content items for {selectedType.name}</h2>
          {selectedItems.map((item) => (
            <form key={item.id} action={saveContentItem}>
              <input type="hidden" name="id" defaultValue={item.id} />
              <input name="title" defaultValue={item.title} placeholder="Title" required />
              <input name="slug" defaultValue={item.slug} placeholder="slug" required />
              <label>
                Published <input type="checkbox" name="published" defaultChecked={item.published} />
              </label>
              <textarea name="data" defaultValue={JSON.stringify(item.data, null, 2)} rows={8} required />
              <button type="submit">Save</button>
              <button type="button" onClick={() => void deleteContentItem(item.id)}>Delete</button>
            </form>
          ))}

          <h3>Create content item</h3>
          <form action={saveContentItem}>
            <input name="title" placeholder="Title" required />
            <input name="slug" placeholder="slug" required />
            <label>
              Published <input type="checkbox" name="published" />
            </label>
            <textarea name="data" defaultValue="{}" rows={8} required />
            <button type="submit">Create</button>
          </form>
        </>
      )}
    </section>
  );
}
