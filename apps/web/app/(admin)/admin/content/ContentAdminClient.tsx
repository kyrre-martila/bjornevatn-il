"use client";

import * as React from "react";
import type {
  AdminContentFieldDefinition,
  AdminContentItem,
  AdminContentType,
} from "../../../../lib/admin/content";

type Props = {
  initialContentTypes: AdminContentType[];
  initialGroupedItems: Array<{ contentTypeId: string; items: AdminContentItem[] }>;
};

type ContentItemDraft = {
  title: string;
  slug: string;
  published: boolean;
  values: Record<string, string>;
  rawData: string;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function fieldTypeInputType(type: AdminContentFieldDefinition["type"]) {
  if (type === "date") return "date";
  return "text";
}

function stringifyFieldValue(value: unknown, type: AdminContentFieldDefinition["type"]) {
  if (value === undefined || value === null) return "";
  if (type === "boolean") return value ? "true" : "false";
  if (type === "date" && typeof value === "string") return value.slice(0, 10);
  return String(value);
}

function buildValues(
  fields: AdminContentFieldDefinition[],
  data: Record<string, unknown>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = stringifyFieldValue(data[field.key], field.type);
    return acc;
  }, {});
}

function buildDataFromFields(
  fields: AdminContentFieldDefinition[],
  values: Record<string, string>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  fields.forEach((field) => {
    const value = values[field.key] ?? "";
    if (!value && field.type !== "boolean") {
      return;
    }

    if (field.type === "boolean") {
      data[field.key] = value === "true";
      return;
    }

    data[field.key] = value;
  });

  return data;
}

function emptyDraft(contentType: AdminContentType): ContentItemDraft {
  const values = contentType.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.type === "boolean" ? "false" : "";
    return acc;
  }, {});

  return {
    title: "",
    slug: "",
    published: false,
    values,
    rawData: "{}",
  };
}

function ContentItemEditor({
  item,
  contentType,
  onSave,
  onDelete,
}: {
  item: AdminContentItem;
  contentType: AdminContentType;
  onSave: (payload: {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    data: Record<string, unknown>;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(item.title);
  const [slug, setSlug] = React.useState(item.slug);
  const [published, setPublished] = React.useState(item.published);
  const [values, setValues] = React.useState<Record<string, string>>(
    buildValues(contentType.fields, item.data),
  );
  const [rawData, setRawData] = React.useState(JSON.stringify(item.data, null, 2));

  React.useEffect(() => {
    setValues(buildValues(contentType.fields, item.data));
    setRawData(JSON.stringify(item.data, null, 2));
  }, [contentType.fields, item.data]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let data = buildDataFromFields(contentType.fields, values);
    if (contentType.fields.length === 0) {
      try {
        const parsed = JSON.parse(rawData) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("invalid");
        }
        data = parsed as Record<string, unknown>;
      } catch {
        return;
      }
    }

    await onSave({
      id: item.id,
      title,
      slug: normalizeSlug(slug),
      published,
      data,
    });
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
      <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" required />
      <label>
        Published <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
      </label>
      {contentType.fields.length > 0 ? (
        contentType.fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.type === "textarea" || field.type === "rich_text" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((curr) => ({ ...curr, [field.key]: e.target.value }))}
                required={field.required}
                rows={field.type === "rich_text" ? 6 : 3}
              />
            ) : field.type === "boolean" ? (
              <select
                value={values[field.key] ?? "false"}
                onChange={(e) => setValues((curr) => ({ ...curr, [field.key]: e.target.value }))}
              >
                <option value="false">False</option>
                <option value="true">True</option>
              </select>
            ) : (
              <input
                type={fieldTypeInputType(field.type)}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((curr) => ({ ...curr, [field.key]: e.target.value }))}
                required={field.required}
              />
            )}
          </label>
        ))
      ) : (
        <textarea value={rawData} onChange={(e) => setRawData(e.target.value)} rows={8} required />
      )}
      <button type="submit">Save</button>
      <button type="button" onClick={() => void onDelete(item.id)}>Delete</button>
    </form>
  );
}

export function ContentAdminClient({ initialContentTypes, initialGroupedItems }: Props) {
  const [contentTypes, setContentTypes] = React.useState(initialContentTypes);
  const [itemsByType, setItemsByType] = React.useState(
    () => new Map(initialGroupedItems.map((entry) => [entry.contentTypeId, entry.items])),
  );
  const [selectedTypeId, setSelectedTypeId] = React.useState(initialContentTypes[0]?.id ?? "");
  const [createDrafts, setCreateDrafts] = React.useState<Record<string, ContentItemDraft>>(() =>
    Object.fromEntries(initialContentTypes.map((type) => [type.id, emptyDraft(type)])),
  );
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
    const fieldsRaw = String(formData.get("fields") ?? "[]");
    let fields: AdminContentFieldDefinition[] = [];
    try {
      const parsed = JSON.parse(fieldsRaw) as unknown;
      if (!Array.isArray(parsed)) throw new Error();
      fields = parsed as AdminContentFieldDefinition[];
    } catch {
      setError("Field definitions must be a JSON array.");
      return;
    }

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      slug: normalizeSlug(String(formData.get("slug") ?? "")),
      description: String(formData.get("description") ?? "").trim(),
      fields,
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
    setCreateDrafts((curr) => ({ ...curr, [next.id]: emptyDraft(next) }));
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

  async function saveContentItem(payload: {
    id?: string;
    title: string;
    slug: string;
    published: boolean;
    data: Record<string, unknown>;
  }) {
    if (!selectedType) return;
    setError(null); setStatus(null);

    const requestPayload = {
      contentTypeId: selectedType.id,
      ...payload,
    };

    const res = await fetch(payload.id ? `/api/admin/content-items/${payload.id}` : "/api/admin/content-items", {
      method: payload.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      setError("Unable to save content item.");
      return;
    }

    await refreshItems(selectedType.id);
    if (!payload.id) {
      setCreateDrafts((curr) => ({ ...curr, [selectedType.id]: emptyDraft(selectedType) }));
    }
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

  const createDraft = selectedType ? createDrafts[selectedType.id] ?? emptyDraft(selectedType) : null;

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
          <textarea name="fields" defaultValue={JSON.stringify(type.fields, null, 2)} rows={6} required />
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
        <textarea name="fields" defaultValue="[]" rows={6} required />
        <button type="submit">Create</button>
      </form>

      {selectedType && createDraft && (
        <>
          <h2>Content items for {selectedType.name}</h2>
          {selectedItems.map((item) => (
            <ContentItemEditor
              key={item.id}
              item={item}
              contentType={selectedType}
              onSave={(payload) => saveContentItem(payload)}
              onDelete={deleteContentItem}
            />
          ))}

          <h3>Create content item</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedType) return;
              const data = buildDataFromFields(selectedType.fields, createDraft.values);
              void saveContentItem({
                title: createDraft.title,
                slug: normalizeSlug(createDraft.slug),
                published: createDraft.published,
                data,
              });
            }}
          >
            <input
              value={createDraft.title}
              onChange={(e) =>
                setCreateDrafts((curr) => ({
                  ...curr,
                  [selectedType.id]: { ...createDraft, title: e.target.value },
                }))
              }
              placeholder="Title"
              required
            />
            <input
              value={createDraft.slug}
              onChange={(e) =>
                setCreateDrafts((curr) => ({
                  ...curr,
                  [selectedType.id]: { ...createDraft, slug: e.target.value },
                }))
              }
              placeholder="slug"
              required
            />
            <label>
              Published
              <input
                type="checkbox"
                checked={createDraft.published}
                onChange={(e) =>
                  setCreateDrafts((curr) => ({
                    ...curr,
                    [selectedType.id]: { ...createDraft, published: e.target.checked },
                  }))
                }
              />
            </label>
            {selectedType.fields.length > 0 ? (
              selectedType.fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.type === "textarea" || field.type === "rich_text" ? (
                    <textarea
                      value={createDraft.values[field.key] ?? ""}
                      onChange={(e) =>
                        setCreateDrafts((curr) => ({
                          ...curr,
                          [selectedType.id]: {
                            ...createDraft,
                            values: { ...createDraft.values, [field.key]: e.target.value },
                          },
                        }))
                      }
                      required={field.required}
                      rows={field.type === "rich_text" ? 6 : 3}
                    />
                  ) : field.type === "boolean" ? (
                    <select
                      value={createDraft.values[field.key] ?? "false"}
                      onChange={(e) =>
                        setCreateDrafts((curr) => ({
                          ...curr,
                          [selectedType.id]: {
                            ...createDraft,
                            values: { ...createDraft.values, [field.key]: e.target.value },
                          },
                        }))
                      }
                    >
                      <option value="false">False</option>
                      <option value="true">True</option>
                    </select>
                  ) : (
                    <input
                      type={fieldTypeInputType(field.type)}
                      value={createDraft.values[field.key] ?? ""}
                      onChange={(e) =>
                        setCreateDrafts((curr) => ({
                          ...curr,
                          [selectedType.id]: {
                            ...createDraft,
                            values: { ...createDraft.values, [field.key]: e.target.value },
                          },
                        }))
                      }
                      required={field.required}
                    />
                  )}
                </label>
              ))
            ) : (
              <p>Add field definitions to the content type to enable structured item editing.</p>
            )}
            <button type="submit">Create</button>
          </form>
        </>
      )}
    </section>
  );
}
