"use client";

import * as React from "react";
import type {
  AdminContentFieldDefinition,
  AdminContentItem,
  AdminContentType,
} from "../../../../lib/admin/content";

type Props = {
  canManageContentTypes: boolean;
  initialContentTypes: AdminContentType[];
  initialGroupedItems: Array<{
    contentTypeId: string;
    items: AdminContentItem[];
  }>;
};

type ContentItemDraft = {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  published: boolean;
  values: Record<string, string>;
};

type ContentTypeDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  fields: AdminContentFieldDefinition[];
};

const FIELD_TYPE_LABELS: Record<AdminContentFieldDefinition["type"], string> = {
  text: "Short text",
  textarea: "Paragraph",
  rich_text: "Rich text",
  image: "Image URL",
  relation: "Reference",
  media: "Media reference",
  contentItem: "Content item reference",
  page: "Page reference",
  date: "Date",
  boolean: "Yes / no",
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getFieldLabel(field: AdminContentFieldDefinition) {
  return field.label?.trim() || field.key;
}

function fieldTypeInputType(type: AdminContentFieldDefinition["type"]) {
  if (type === "date") return "date";
  return "text";
}

function parseMultiReference(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isMultipleReferenceField(field: AdminContentFieldDefinition): boolean {
  return Boolean(
    (field.type === "relation" ||
      field.type === "media" ||
      field.type === "contentItem" ||
      field.type === "page") &&
      field.relation?.multiple,
  );
}

function stringifyFieldValue(
  value: unknown,
  field: AdminContentFieldDefinition,
) {
  if (value === undefined || value === null) return "";
  if (field.type === "boolean") return value ? "true" : "false";
  if (field.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }
  if (isMultipleReferenceField(field) && Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string").join(", ");
  }
  return String(value);
}

function buildValues(
  fields: AdminContentFieldDefinition[],
  data: Record<string, unknown>,
): Record<string, string> {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = stringifyFieldValue(data[field.key], field);
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

    if (isMultipleReferenceField(field)) {
      data[field.key] = parseMultiReference(value);
      return;
    }

    data[field.key] = value;
  });

  return data;
}

function emptyDraft(contentType: AdminContentType): ContentItemDraft {
  const values = contentType.fields.reduce<Record<string, string>>(
    (acc, field) => {
      acc[field.key] = field.type === "boolean" ? "false" : "";
      return acc;
    },
    {},
  );

  return {
    title: "",
    slug: "",
    seoTitle: "",
    seoDescription: "",
    seoImage: "",
    canonicalUrl: "",
    noIndex: false,
    published: false,
    values,
  };
}

function toContentTypeDraft(contentType: AdminContentType): ContentTypeDraft {
  return {
    id: contentType.id,
    name: contentType.name,
    slug: contentType.slug,
    description: contentType.description,
    fields: contentType.fields,
  };
}

function emptyFieldDefinition(): AdminContentFieldDefinition {
  return {
    key: "",
    label: "",
    description: "",
    placeholder: "",
    type: "text",
    required: false,
  };
}

function FieldDefinitionEditor({
  field,
  onChange,
  onRemove,
}: {
  field: AdminContentFieldDefinition;
  onChange: (next: AdminContentFieldDefinition) => void;
  onRemove: () => void;
}) {
  return (
    <fieldset>
      <legend>{field.label?.trim() || field.key || "New field"}</legend>
      <label>
        Field key
        <input
          value={field.key}
          onChange={(e) => onChange({ ...field, key: e.target.value })}
          placeholder="e.g. summary"
          required
        />
      </label>
      <label>
        Editor label
        <input
          value={field.label ?? ""}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="e.g. Summary"
        />
      </label>
      <label>
        Help text
        <input
          value={field.description ?? ""}
          onChange={(e) => onChange({ ...field, description: e.target.value })}
          placeholder="Shown under the field for editors"
        />
      </label>
      <label>
        Placeholder
        <input
          value={field.placeholder ?? ""}
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
          placeholder="Optional hint inside the input"
        />
      </label>
      <label>
        Field type
        <select
          value={field.type}
          onChange={(e) =>
            onChange({
              ...field,
              type: e.target.value as AdminContentFieldDefinition["type"],
            })
          }
        >
          {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Required for publishing
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
      </label>
      {(field.type === "relation" ||
        field.type === "media" ||
        field.type === "contentItem" ||
        field.type === "page") && (
        <label>
          Allow multiple values (comma-separated IDs)
          <input
            type="checkbox"
            checked={Boolean(field.relation?.multiple)}
            onChange={(e) =>
              onChange({
                ...field,
                relation: {
                  targetType:
                    field.relation?.targetType ??
                    (field.type === "page"
                      ? "page"
                      : field.type === "media"
                        ? "media"
                        : "contentType"),
                  ...field.relation,
                  multiple: e.target.checked,
                },
              })
            }
          />
        </label>
      )}
      <button type="button" onClick={onRemove}>
        Remove field
      </button>
    </fieldset>
  );
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
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    canonicalUrl: string | null;
    noIndex: boolean;
    published: boolean;
    data: Record<string, unknown>;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(item.title);
  const [slug, setSlug] = React.useState(item.slug);
  const [seoTitle, setSeoTitle] = React.useState(item.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = React.useState(
    item.seoDescription ?? "",
  );
  const [seoImage, setSeoImage] = React.useState(item.seoImage ?? "");
  const [canonicalUrl, setCanonicalUrl] = React.useState(
    item.canonicalUrl ?? "",
  );
  const [noIndex, setNoIndex] = React.useState(item.noIndex);
  const [published, setPublished] = React.useState(item.published);
  const [values, setValues] = React.useState<Record<string, string>>(
    buildValues(contentType.fields, item.data),
  );

  React.useEffect(() => {
    setValues(buildValues(contentType.fields, item.data));
    setSeoTitle(item.seoTitle ?? "");
    setSeoDescription(item.seoDescription ?? "");
    setSeoImage(item.seoImage ?? "");
    setCanonicalUrl(item.canonicalUrl ?? "");
    setNoIndex(item.noIndex);
  }, [contentType.fields, item]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await onSave({
      id: item.id,
      title,
      slug: normalizeSlug(slug),
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      seoImage: seoImage.trim() || null,
      canonicalUrl: canonicalUrl.trim() || null,
      noIndex,
      published,
      data: buildDataFromFields(contentType.fields, values),
    });
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <h4>{item.title}</h4>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
      </label>
      <label>
        URL slug
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="about-us"
          required
        />
      </label>
      <label>
        Published
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
      </label>
      <fieldset className="page-editor__seo">
        <legend>Search appearance</legend>
        <label>
          SEO Title
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
          />
        </label>
        <label>
          SEO Description
          <textarea
            rows={3}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </label>
      </fieldset>
      {contentType.fields.length > 0 ? (
        contentType.fields.map((field) => (
          <label key={field.key}>
            {getFieldLabel(field)}
            {field.description ? <small>{field.description}</small> : null}
            {field.type === "textarea" || field.type === "rich_text" ? (
              <textarea
                value={values[field.key] ?? ""}
                onChange={(e) =>
                  setValues((curr) => ({
                    ...curr,
                    [field.key]: e.target.value,
                  }))
                }
                required={field.required}
                rows={field.type === "rich_text" ? 6 : 3}
                placeholder={field.placeholder}
              />
            ) : field.type === "boolean" ? (
              <select
                value={values[field.key] ?? "false"}
                onChange={(e) =>
                  setValues((curr) => ({
                    ...curr,
                    [field.key]: e.target.value,
                  }))
                }
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            ) : (
              <input
                type={fieldTypeInputType(field.type)}
                value={values[field.key] ?? ""}
                onChange={(e) =>
                  setValues((curr) => ({
                    ...curr,
                    [field.key]: e.target.value,
                  }))
                }
                required={field.required}
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))
      ) : (
        <p>This content type has no editor fields yet. Ask an administrator to add fields first.</p>
      )}
      <button type="submit">Save</button>
      <button type="button" onClick={() => void onDelete(item.id)}>
        Delete
      </button>
    </form>
  );
}

export function ContentAdminClient({
  canManageContentTypes,
  initialContentTypes,
  initialGroupedItems,
}: Props) {
  const [contentTypes, setContentTypes] = React.useState(initialContentTypes);
  const [contentTypeDrafts, setContentTypeDrafts] = React.useState<
    Record<string, ContentTypeDraft>
  >(() =>
    Object.fromEntries(
      initialContentTypes.map((type) => [type.id, toContentTypeDraft(type)]),
    ),
  );
  const [itemsByType, setItemsByType] = React.useState(
    () =>
      new Map(
        initialGroupedItems.map((entry) => [entry.contentTypeId, entry.items]),
      ),
  );
  const [selectedTypeId, setSelectedTypeId] = React.useState(
    initialContentTypes[0]?.id ?? "",
  );
  const [createDrafts, setCreateDrafts] = React.useState<
    Record<string, ContentItemDraft>
  >(() =>
    Object.fromEntries(
      initialContentTypes.map((type) => [type.id, emptyDraft(type)]),
    ),
  );
  const [newTypeDraft, setNewTypeDraft] = React.useState<ContentTypeDraft>({
    name: "",
    slug: "",
    description: "",
    fields: [],
  });
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const selectedType =
    contentTypes.find((type) => type.id === selectedTypeId) ?? null;
  const selectedItems = selectedType
    ? (itemsByType.get(selectedType.id) ?? [])
    : [];

  async function refreshItems(contentTypeId: string) {
    const res = await fetch(
      `/api/admin/content-items?contentTypeId=${encodeURIComponent(contentTypeId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const items = (await res.json()) as AdminContentItem[];
    setItemsByType((curr) => new Map(curr).set(contentTypeId, items));
  }

  async function saveContentType(draft: ContentTypeDraft) {
    setError(null);
    setStatus(null);

    const payload = {
      name: draft.name.trim(),
      slug: normalizeSlug(draft.slug),
      description: draft.description.trim(),
      fields: draft.fields,
    };

    const res = await fetch(
      draft.id
        ? `/api/admin/content-types/${draft.id}`
        : "/api/admin/content-types",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      setError("Unable to save content type.");
      return;
    }

    const next = (await res.json()) as AdminContentType;
    setContentTypes((curr) => {
      const exists = curr.some((entry) => entry.id === next.id);
      return exists
        ? curr.map((entry) => (entry.id === next.id ? next : entry))
        : [next, ...curr];
    });
    setContentTypeDrafts((curr) => ({ ...curr, [next.id]: toContentTypeDraft(next) }));
    setCreateDrafts((curr) => ({ ...curr, [next.id]: emptyDraft(next) }));
    setSelectedTypeId(next.id);
    setNewTypeDraft({ name: "", slug: "", description: "", fields: [] });
    setStatus("Content model saved.");
  }

  async function deleteContentType(id: string) {
    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/content-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(
        "Unable to delete content type. Delete all content items first.",
      );
      return;
    }

    setContentTypes((curr) => curr.filter((entry) => entry.id !== id));
    setItemsByType((curr) => {
      const next = new Map(curr);
      next.delete(id);
      return next;
    });
    setSelectedTypeId((current) => (current === id ? "" : current));
    setStatus("Content model deleted.");
  }

  async function saveContentItem(payload: {
    id?: string;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    canonicalUrl: string | null;
    noIndex: boolean;
    published: boolean;
    data: Record<string, unknown>;
  }) {
    if (!selectedType) return;
    setError(null);
    setStatus(null);

    const requestPayload = {
      contentTypeId: selectedType.id,
      ...payload,
    };

    const res = await fetch(
      payload.id
        ? `/api/admin/content-items/${payload.id}`
        : "/api/admin/content-items",
      {
        method: payload.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestPayload),
      },
    );

    if (!res.ok) {
      setError("Unable to save content item.");
      return;
    }

    await refreshItems(selectedType.id);
    if (!payload.id) {
      setCreateDrafts((curr) => ({
        ...curr,
        [selectedType.id]: emptyDraft(selectedType),
      }));
    }
    setStatus("Entry saved.");
  }

  async function deleteContentItem(id: string) {
    if (!selectedType) return;
    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/content-items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Unable to delete content item.");
      return;
    }

    await refreshItems(selectedType.id);
    setStatus("Entry deleted.");
  }

  const createDraft = selectedType
    ? (createDrafts[selectedType.id] ?? emptyDraft(selectedType))
    : null;

  return (
    <section className="admin-pages">
      <h1 className="hero__title">Content editor</h1>
      <p>Choose a content area and edit entries using guided fields.</p>
      {error && <p>{error}</p>}
      {status && <p>{status}</p>}

      <h2>Content areas</h2>
      <div>
        {contentTypes.map((type) => (
          <button key={type.id} type="button" onClick={() => setSelectedTypeId(type.id)}>
            {type.name}
          </button>
        ))}
      </div>

      {canManageContentTypes && (
        <>
          <h2>Content model setup</h2>
          {contentTypes.map((type) => {
            const draft = contentTypeDrafts[type.id] ?? toContentTypeDraft(type);
            return (
              <article key={type.id}>
                <h3>{type.name}</h3>
                <label>
                  Name
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: { ...draft, name: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Slug
                  <input
                    value={draft.slug}
                    onChange={(e) =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: { ...draft, slug: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  Description
                  <input
                    value={draft.description}
                    onChange={(e) =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: { ...draft, description: e.target.value },
                      }))
                    }
                  />
                </label>
                <p>Fields shown to editors</p>
                {draft.fields.map((field, index) => (
                  <FieldDefinitionEditor
                    key={`${field.key}-${index}`}
                    field={field}
                    onChange={(nextField) =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: {
                          ...draft,
                          fields: draft.fields.map((entry, idx) =>
                            idx === index ? nextField : entry,
                          ),
                        },
                      }))
                    }
                    onRemove={() =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: {
                          ...draft,
                          fields: draft.fields.filter((_, idx) => idx !== index),
                        },
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setContentTypeDrafts((curr) => ({
                      ...curr,
                      [type.id]: {
                        ...draft,
                        fields: [...draft.fields, emptyFieldDefinition()],
                      },
                    }))
                  }
                >
                  Add field
                </button>
                <button type="button" onClick={() => void saveContentType(draft)}>
                  Save content model
                </button>
                <button type="button" onClick={() => void deleteContentType(type.id)}>
                  Delete content model
                </button>
              </article>
            );
          })}

          <h3>Create content area</h3>
          <article>
            <label>
              Name
              <input
                value={newTypeDraft.name}
                onChange={(e) =>
                  setNewTypeDraft((curr) => ({ ...curr, name: e.target.value }))
                }
              />
            </label>
            <label>
              Slug
              <input
                value={newTypeDraft.slug}
                onChange={(e) =>
                  setNewTypeDraft((curr) => ({ ...curr, slug: e.target.value }))
                }
              />
            </label>
            <label>
              Description
              <input
                value={newTypeDraft.description}
                onChange={(e) =>
                  setNewTypeDraft((curr) => ({ ...curr, description: e.target.value }))
                }
              />
            </label>
            {newTypeDraft.fields.map((field, index) => (
              <FieldDefinitionEditor
                key={`new-${field.key}-${index}`}
                field={field}
                onChange={(nextField) =>
                  setNewTypeDraft((curr) => ({
                    ...curr,
                    fields: curr.fields.map((entry, idx) =>
                      idx === index ? nextField : entry,
                    ),
                  }))
                }
                onRemove={() =>
                  setNewTypeDraft((curr) => ({
                    ...curr,
                    fields: curr.fields.filter((_, idx) => idx !== index),
                  }))
                }
              />
            ))}
            <button
              type="button"
              onClick={() =>
                setNewTypeDraft((curr) => ({
                  ...curr,
                  fields: [...curr.fields, emptyFieldDefinition()],
                }))
              }
            >
              Add field
            </button>
            <button type="button" onClick={() => void saveContentType(newTypeDraft)}>
              Create content area
            </button>
          </article>
        </>
      )}

      {selectedType && createDraft && (
        <>
          <h2>{selectedType.name} entries</h2>
          <p>{selectedType.description}</p>
          {selectedItems.map((item) => (
            <ContentItemEditor
              key={item.id}
              item={item}
              contentType={selectedType}
              onSave={(payload) => saveContentItem(payload)}
              onDelete={deleteContentItem}
            />
          ))}

          <h3>Create new entry</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveContentItem({
                title: createDraft.title,
                slug: normalizeSlug(createDraft.slug),
                seoTitle: createDraft.seoTitle.trim() || null,
                seoDescription: createDraft.seoDescription.trim() || null,
                seoImage: createDraft.seoImage.trim() || null,
                canonicalUrl: createDraft.canonicalUrl.trim() || null,
                noIndex: createDraft.noIndex,
                published: createDraft.published,
                data: buildDataFromFields(selectedType.fields, createDraft.values),
              });
            }}
          >
            <label>
              Title
              <input
                value={createDraft.title}
                onChange={(e) =>
                  setCreateDrafts((curr) => ({
                    ...curr,
                    [selectedType.id]: { ...createDraft, title: e.target.value },
                  }))
                }
                required
              />
            </label>
            <label>
              URL slug
              <input
                value={createDraft.slug}
                onChange={(e) =>
                  setCreateDrafts((curr) => ({
                    ...curr,
                    [selectedType.id]: { ...createDraft, slug: e.target.value },
                  }))
                }
                required
              />
            </label>
            {selectedType.fields.map((field) => (
              <label key={field.key}>
                {getFieldLabel(field)}
                {field.description ? <small>{field.description}</small> : null}
                <input
                  value={createDraft.values[field.key] ?? ""}
                  onChange={(e) =>
                    setCreateDrafts((curr) => ({
                      ...curr,
                      [selectedType.id]: {
                        ...createDraft,
                        values: {
                          ...createDraft.values,
                          [field.key]: e.target.value,
                        },
                      },
                    }))
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </label>
            ))}
            <button type="submit">Create entry</button>
          </form>
        </>
      )}
    </section>
  );
}
