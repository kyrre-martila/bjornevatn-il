"use client";

import * as React from "react";
import type {
  AdminContentFieldDefinition,
  AdminContentItem,
  AdminContentType,
} from "../../../../lib/admin/content";
import { HtmlRichTextEditor } from "../components/HtmlRichTextEditor";

type WorkflowStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

const WORKFLOW_ACTIONS: Array<{ key: WorkflowStatus; label: string }> = [
  { key: "draft", label: "Save Draft" },
  { key: "in_review", label: "Submit for Review" },
  { key: "approved", label: "Approve" },
  { key: "published", label: "Publish" },
  { key: "archived", label: "Archive" },
];

function canUseWorkflowAction(
  role: "editor" | "admin" | "superadmin",
  action: WorkflowStatus,
): boolean {
  if (role === "superadmin") return true;
  if (role === "admin") return true;
  return action === "draft" || action === "in_review";
}

function workflowStatusLabel(status: WorkflowStatus): string {
  return status.replace("_", " ");
}

type Props = {
  canManageContentTypes: boolean;
  initialContentTypes: AdminContentType[];
  initialItems: AdminContentItem[];
  initialContentTypeId: string;
  initialHasNextPage: boolean;
  pageSize: number;
  canUseMediaLibrary: boolean;
  canEditSlug: boolean;
  canEditRelations: boolean;
  initialSelectedTypeSlug?: string;
  userRole: "editor" | "admin" | "superadmin";
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
  workflowStatus: WorkflowStatus;
  publishAt: string;
  unpublishAt: string;
  values: Record<string, string | string[]>;
};

type AdminContentItemRevision = {
  id: string;
  createdAt: string;
  revisionNote: string | null;
  createdById: string | null;
};

type ContentTypeDraft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  isPublic: boolean;
  fields: AdminContentFieldDefinition[];
};

type ReferenceOption = {
  id: string;
  label: string;
  hint?: string;
  typeLabel: string;
  previewUrl?: string;
  filename?: string;
  altText?: string | null;
};

type AdminPageOption = {
  id: string;
  title: string;
  slug: string;
};

type AdminMediaOption = {
  id: string;
  alt?: string | null;
  url: string;
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

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

type ImpactSummaryItem = {
  label: string;
  oldValue?: string;
  newValue?: string;
};

function formatImpactValue(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return "(empty)";
  }
  return value;
}

function formatImpactSummaryMessage(items: ImpactSummaryItem[]): string {
  if (items.length === 0) {
    return "";
  }

  const lines = ["This change will:"];
  for (const item of items) {
    lines.push(`- ${item.label}`);
    if (item.oldValue !== undefined || item.newValue !== undefined) {
      lines.push(`  Old: ${item.oldValue ?? "(unknown)"}`);
      lines.push(`  New: ${item.newValue ?? "(unknown)"}`);
    }
  }
  lines.push("", "Continue?");
  return lines.join("\n");
}

function describeApiError(fallback: string, payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const error = payload as { message?: unknown; error?: unknown };
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
    if (typeof error.error === "string" && error.error.trim()) {
      return error.error;
    }
  }

  return fallback;
}

function humanizeFieldKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}

function getFieldLabel(field: AdminContentFieldDefinition) {
  return field.label?.trim() || humanizeFieldKey(field.key) || "Field";
}

function fieldTypeInputType(type: AdminContentFieldDefinition["type"]) {
  if (type === "date") return "date";
  return "text";
}

function parseReferenceValues(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getReferenceValues(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (entry) => typeof entry === "string" && entry.trim().length > 0,
    );
  }

  if (typeof value !== "string") {
    return [];
  }

  return parseReferenceValues(value);
}

function relationTargetTypeLabel(field: AdminContentFieldDefinition): string {
  if (field.type === "media") return "media item";
  if (field.type === "page") return "page";
  if (field.type === "contentItem") return "content entry";
  return field.relation?.targetSlug
    ? `${field.relation.targetSlug} entry`
    : "related entry";
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

function getPublicItemPath(contentTypeSlug: string, itemSlug: string): string {
  return `/${contentTypeSlug}/${itemSlug}`;
}

function getPublicArchivePath(contentTypeSlug: string): string {
  return `/${contentTypeSlug}`;
}

function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTimeOrNull(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
type VisibilityState = {
  editorialStatus: "Draft" | "Published" | "Scheduled" | "Expired";
  publicVisibility:
    | "Publicly visible"
    | "Not visible to visitors"
    | "Visible only to admins";
  guidance: string;
  canOpenPublicPreview: boolean;
};

function getVisibilityState(
  published: boolean,
  contentTypeIsPublic: boolean,
  publishAt?: string | null,
  unpublishAt?: string | null,
): VisibilityState {
  if (!published) {
    return {
      editorialStatus: "Draft",
      publicVisibility: "Not visible to visitors",
      guidance:
        "Draft changes are private in admin. Publish when this entry is ready for visitors.",
      canOpenPublicPreview: false,
    };
  }

  const now = Date.now();
  const publishAtTime = publishAt ? new Date(publishAt).getTime() : null;
  const unpublishAtTime = unpublishAt ? new Date(unpublishAt).getTime() : null;

  if (publishAtTime !== null && now < publishAtTime) {
    return {
      editorialStatus: "Scheduled",
      publicVisibility: "Not visible to visitors",
      guidance:
        "This entry is scheduled for future publication. It will become visible at the publish date/time.",
      canOpenPublicPreview: false,
    };
  }

  if (unpublishAtTime !== null && now >= unpublishAtTime) {
    return {
      editorialStatus: "Expired",
      publicVisibility: "Not visible to visitors",
      guidance:
        "This entry is past its unpublish date/time. Update the schedule to publish it again.",
      canOpenPublicPreview: false,
    };
  }

  if (!contentTypeIsPublic) {
    return {
      editorialStatus: "Published",
      publicVisibility: "Visible only to admins",
      guidance:
        "This content type is configured as non-public, so visitors cannot open this URL.",
      canOpenPublicPreview: false,
    };
  }

  return {
    editorialStatus: "Published",
    publicVisibility: "Publicly visible",
    guidance:
      "This entry is available on the public site. Use Open preview to confirm what visitors see.",
    canOpenPublicPreview: true,
  };
}

function stringifyFieldValue(
  value: unknown,
  field: AdminContentFieldDefinition,
): string | string[] {
  if (value === undefined || value === null) return "";
  if (field.type === "boolean") return value ? "true" : "false";
  if (field.type === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }
  if (isMultipleReferenceField(field) && Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return String(value);
}

function buildValues(
  fields: AdminContentFieldDefinition[],
  data: Record<string, unknown>,
): Record<string, string | string[]> {
  return fields.reduce<Record<string, string | string[]>>((acc, field) => {
    acc[field.key] = stringifyFieldValue(data[field.key], field);
    return acc;
  }, {});
}

function buildDataFromFields(
  fields: AdminContentFieldDefinition[],
  values: Record<string, string | string[]>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  fields.forEach((field) => {
    const value = values[field.key] ?? "";
    const hasValue = Array.isArray(value)
      ? value.length > 0
      : value.trim().length > 0;

    if (!hasValue && field.type !== "boolean") {
      return;
    }

    if (field.type === "boolean") {
      data[field.key] = value === "true";
      return;
    }

    if (isMultipleReferenceField(field)) {
      data[field.key] = getReferenceValues(value);
      return;
    }

    if (
      (field.type === "relation" ||
        field.type === "media" ||
        field.type === "contentItem" ||
        field.type === "page") &&
      Array.isArray(value)
    ) {
      data[field.key] = value[0] ?? "";
      return;
    }

    data[field.key] = value;
  });

  return data;
}

function validateContentItemInput(
  fields: AdminContentFieldDefinition[],
  data: Record<string, unknown>,
  getReferenceOptions: (
    field: AdminContentFieldDefinition,
  ) => ReferenceOption[],
): string | null {
  for (const field of fields) {
    const value = data[field.key];
    const hasValue =
      value !== undefined &&
      value !== null &&
      (typeof value !== "string" || value.trim().length > 0) &&
      (!Array.isArray(value) || value.length > 0);

    if (field.required && !hasValue) {
      return `${getFieldLabel(field)} is required before saving.`;
    }

    if (field.type === "date" && typeof value === "string" && value.trim()) {
      if (Number.isNaN(Date.parse(value))) {
        return `${getFieldLabel(field)} must be a real calendar date.`;
      }
    }

    if (
      field.type === "relation" ||
      field.type === "media" ||
      field.type === "contentItem" ||
      field.type === "page"
    ) {
      const allowedValues = new Set(
        getReferenceOptions(field).map((option) => option.id),
      );
      const relationValues = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : typeof value === "string" && value.trim()
          ? [value.trim()]
          : [];

      if (relationValues.length > 0 && allowedValues.size === 0) {
        return `${getFieldLabel(field)} cannot be saved yet because there are no selectable ${relationTargetTypeLabel(field)} records.`;
      }

      const invalidValue = relationValues.find(
        (entry) => !allowedValues.has(entry),
      );
      if (invalidValue) {
        if (field.type === "media") {
          return `${getFieldLabel(field)} has an invalid media selection. Please choose an item from the media library list.`;
        }
        return `${getFieldLabel(field)} includes a relation that is no longer available. Please reselect from the current list.`;
      }
    }
  }

  return null;
}

function emptyDraft(contentType: AdminContentType): ContentItemDraft {
  const values = contentType.fields.reduce<Record<string, string | string[]>>(
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
    workflowStatus: "draft",
    publishAt: "",
    unpublishAt: "",
    values,
  };
}

function toContentTypeDraft(contentType: AdminContentType): ContentTypeDraft {
  return {
    id: contentType.id,
    name: contentType.name,
    slug: contentType.slug,
    description: contentType.description,
    isPublic: contentType.isPublic,
    fields: contentType.fields,
  };
}

function emptyFieldDefinition(): AdminContentFieldDefinition {
  return {
    key: "",
    label: "",
    description: "",
    placeholder: "",
    helpText: "",
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
        Internal field key
        <input
          value={field.key}
          onChange={(e) => onChange({ ...field, key: e.target.value })}
          placeholder="e.g. summary"
          required
        />
      </label>
      <label>
        Field label shown to editors
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
        Extra editorial guidance
        <input
          value={field.helpText ?? ""}
          onChange={(e) => onChange({ ...field, helpText: e.target.value })}
          placeholder="Optional guidance for how this field should be written"
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
          Allow multiple selections
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

function matchesReferenceSearch(
  option: ReferenceOption,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    option.label,
    option.hint ?? "",
    option.typeLabel,
    option.filename ?? "",
    option.altText ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function ContentFieldInput({
  field,
  value,
  onChange,
  options,
  canUseMediaLibrary,
}: {
  field: AdminContentFieldDefinition;
  value: string | string[];
  onChange: (nextValue: string | string[]) => void;
  options: ReferenceOption[];
  canUseMediaLibrary: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const referenceValues = getReferenceValues(value);
  const isReferenceField =
    field.type === "relation" ||
    field.type === "media" ||
    field.type === "contentItem" ||
    field.type === "page";
  const filteredOptions = React.useMemo(
    () => options.filter((option) => matchesReferenceSearch(option, search)),
    [options, search],
  );

  if (field.type === "rich_text") {
    const htmlValue = Array.isArray(value) ? value.join("\n") : value;

    return (
      <HtmlRichTextEditor
        value={htmlValue}
        onChange={(nextValue) => onChange(nextValue)}
        required={field.required}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={Array.isArray(value) ? value.join(", ") : value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        rows={3}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === "boolean") {
    const normalizedValue = Array.isArray(value)
      ? (value[0] ?? "false")
      : value;
    return (
      <select
        value={normalizedValue || "false"}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="false">No</option>
        <option value="true">Yes</option>
      </select>
    );
  }

  if (isReferenceField && options.length > 0) {
    if (field.type === "media" && !canUseMediaLibrary) {
      return (
        <input
          type="text"
          value={Array.isArray(value) ? (value[0] ?? "") : value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder || "Select from media library"}
          disabled
        />
      );
    }

    if (field.relation?.multiple) {
      const selectedIds = new Set(referenceValues);
      return (
        <div className="content-reference-picker">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${relationTargetTypeLabel(field)} options`}
          />
          <small>
            Selected {referenceValues.length}{" "}
            {referenceValues.length === 1 ? "item" : "items"}.
          </small>
          <div className="content-reference-picker__options">
            {filteredOptions.map((option) => {
              const checked = selectedIds.has(option.id);
              return (
                <label
                  key={option.id}
                  className="content-reference-picker__option"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...referenceValues, option.id]
                        : referenceValues.filter(
                            (entry) => entry !== option.id,
                          );
                      onChange(next);
                    }}
                  />
                  <span>
                    <strong>{option.label}</strong>{" "}
                    <em>({option.typeLabel})</em>
                    {option.hint ? <small>{option.hint}</small> : null}
                    {option.typeLabel === "Media" ? (
                      <small>
                        {option.filename ?? "Unknown file"} ·{" "}
                        {option.altText?.trim()
                          ? "Alt text set"
                          : "Missing alt text"}
                      </small>
                    ) : null}
                  </span>
                </label>
              );
            })}
            {filteredOptions.length === 0 ? (
              <small>No matches found.</small>
            ) : null}
          </div>
        </div>
      );
    }

    const selectedOption = options.find(
      (option) => option.id === (referenceValues[0] ?? ""),
    );

    return (
      <div className="content-reference-picker">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${relationTargetTypeLabel(field)} options`}
        />
        <select
          value={referenceValues[0] ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {relationTargetTypeLabel(field)}</option>
          {filteredOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} ({option.typeLabel})
            </option>
          ))}
        </select>
        {selectedOption ? (
          <>
            <small>
              Selected: <strong>{selectedOption.label}</strong> (
              {selectedOption.typeLabel})
              {selectedOption.hint ? ` · ${selectedOption.hint}` : ""}
              {selectedOption.typeLabel === "Media"
                ? ` · ${selectedOption.filename ?? "Unknown file"} · ${selectedOption.altText?.trim() ? "Alt text set" : "Missing alt text"}`
                : ""}
            </small>
            {selectedOption.typeLabel === "Media" &&
            selectedOption.previewUrl ? (
              <img
                src={selectedOption.previewUrl}
                alt={selectedOption.altText?.trim() || "Selected media preview"}
                className="content-reference-picker__preview"
              />
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <input
      type={fieldTypeInputType(field.type)}
      value={Array.isArray(value) ? value.join(", ") : value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
      placeholder={field.placeholder}
    />
  );
}

function ContentItemEditor({
  item,
  contentType,
  onSave,
  onDelete,
  onDuplicate,
  getReferenceOptions,
  canUseMediaLibrary,
  canEditSlug,
  canEditRelations,
  onRestoreRevision,
  userRole,
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
    workflowStatus: WorkflowStatus;
    publishAt: string | null;
    unpublishAt: string | null;
    data: Record<string, unknown>;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  getReferenceOptions: (
    field: AdminContentFieldDefinition,
  ) => ReferenceOption[];
  canUseMediaLibrary: boolean;
  canEditSlug: boolean;
  canEditRelations: boolean;
  onRestoreRevision: (revisionId: string) => Promise<void>;
  userRole: "editor" | "admin" | "superadmin";
}) {
  const isSimpleMode = userRole === "editor";
  const canAccessAdvancedSettings = !isSimpleMode;
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
  const [workflowStatus, setWorkflowStatus] = React.useState<WorkflowStatus>(
    item.workflowStatus ?? (item.published ? "published" : "draft"),
  );
  const [published, setPublished] = React.useState(item.published);
  const [publishAt, setPublishAt] = React.useState(
    toDateTimeLocalValue(item.publishAt),
  );
  const [unpublishAt, setUnpublishAt] = React.useState(
    toDateTimeLocalValue(item.unpublishAt),
  );
  const [values, setValues] = React.useState<Record<string, string | string[]>>(
    buildValues(contentType.fields, item.data),
  );
  const [revisions, setRevisions] = React.useState<AdminContentItemRevision[]>(
    [],
  );

  React.useEffect(() => {
    let active = true;
    void fetch(`/api/admin/content-items/${item.id}/revisions`, {
      cache: "no-store",
    })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<AdminContentItemRevision[]>)
          : Promise.resolve([]),
      )
      .then((items) => {
        if (active) {
          setRevisions(items);
        }
      });

    return () => {
      active = false;
    };
  }, [item.id]);

  React.useEffect(() => {
    setValues(buildValues(contentType.fields, item.data));
    setSeoTitle(item.seoTitle ?? "");
    setSeoDescription(item.seoDescription ?? "");
    setSeoImage(item.seoImage ?? "");
    setCanonicalUrl(item.canonicalUrl ?? "");
    setNoIndex(item.noIndex);
    setWorkflowStatus(
      item.workflowStatus ?? (item.published ? "published" : "draft"),
    );
    setPublishAt(toDateTimeLocalValue(item.publishAt));
    setUnpublishAt(toDateTimeLocalValue(item.unpublishAt));
  }, [contentType.fields, item]);

  async function submit(nextWorkflowStatus: WorkflowStatus) {
    const publishAtIso = toIsoDateTimeOrNull(publishAt);
    const unpublishAtIso = toIsoDateTimeOrNull(unpublishAt);

    if (publishAt.trim() && !publishAtIso) {
      window.alert("Publish date/time must be valid.");
      return;
    }

    if (unpublishAt.trim() && !unpublishAtIso) {
      window.alert("Unpublish date/time must be valid.");
      return;
    }

    if (
      publishAtIso &&
      unpublishAtIso &&
      new Date(unpublishAtIso) <= new Date(publishAtIso)
    ) {
      window.alert("Unpublish date/time must be after publish date/time.");
      return;
    }

    await onSave({
      id: item.id,
      title,
      slug: canEditSlug ? normalizeSlug(slug) : normalizeSlug(item.slug),
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
      seoImage: seoImage.trim() || null,
      canonicalUrl: canonicalUrl.trim() || null,
      noIndex,
      published: nextWorkflowStatus === "published",
      workflowStatus: nextWorkflowStatus,
      publishAt: publishAtIso,
      unpublishAt: unpublishAtIso,
      data: buildDataFromFields(contentType.fields, values),
    });
  }

  const visibilityState = getVisibilityState(
    published,
    contentType.isPublic,
    toIsoDateTimeOrNull(publishAt),
    toIsoDateTimeOrNull(unpublishAt),
  );
  const publicItemPath = getPublicItemPath(
    contentType.slug,
    normalizeSlug(slug),
  );
  const publicArchivePath = getPublicArchivePath(contentType.slug);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit("draft");
      }}
    >
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
      {canEditSlug ? (
        <label>
          Web address (slug)
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="about-us"
            required
          />
          <small>
            Changing a published slug can break existing links unless a redirect
            is created.
          </small>
        </label>
      ) : (
        <p>
          Web address is managed by admins. Current URL: /{contentType.slug}/
          {normalizeSlug(item.slug)}
        </p>
      )}
      {canAccessAdvancedSettings ? (
        <details>
          <summary>Advanced settings</summary>
          <label>
            Visible to visitors
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <small>
              Turn this on only when the content is ready. Draft entries stay hidden
              from public pages.
            </small>
          </label>
          <label>
            Publish date/time
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
          </label>
          <label>
            Unpublish date/time (optional)
            <input
              type="datetime-local"
              value={unpublishAt}
              onChange={(e) => setUnpublishAt(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Publishing and preview</legend>
            <p>
              <strong>Workflow status:</strong>{" "}
              {workflowStatusLabel(workflowStatus)} ·{" "}
              <strong>Editorial status:</strong> {visibilityState.editorialStatus}
            </p>
            <p>
              <strong>Public visibility:</strong> {visibilityState.publicVisibility}
            </p>
            <small>{visibilityState.guidance}</small>
            <div>
              {visibilityState.canOpenPublicPreview ? (
                <a href={publicItemPath} target="_blank" rel="noreferrer">
                  Open preview in new tab
                </a>
              ) : (
                <small>
                  Public preview is unavailable until this entry is published in a
                  publicly visible content type.
                </small>
              )}
              {contentType.isPublic ? (
                <>
                  {" "}
                  <a href={publicArchivePath} target="_blank" rel="noreferrer">
                    Open public archive
                  </a>
                </>
              ) : null}
            </div>
          </fieldset>
          <fieldset className="page-editor__seo">
            <legend>Search appearance (SEO)</legend>
            <label>
              Search title
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Leave blank to use the entry title"
              />
            </label>
            <label>
              Search summary
              <textarea
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="One clear sentence that explains this page"
              />
            </label>
          </fieldset>
        </details>
      ) : null}
      {contentType.fields.length > 0 ? (
        contentType.fields
          .filter(
            (field) =>
              canEditRelations ||
              (field.type !== "relation" &&
                field.type !== "media" &&
                field.type !== "contentItem" &&
                field.type !== "page"),
          )
          .map((field) => (
            <label key={field.key}>
              {getFieldLabel(field)}
              {field.description ? <small>{field.description}</small> : null}
              {field.helpText ? <small>{field.helpText}</small> : null}
              <ContentFieldInput
                field={field}
                value={values[field.key] ?? ""}
                onChange={(nextValue) =>
                  setValues((curr) => ({
                    ...curr,
                    [field.key]: nextValue,
                  }))
                }
                options={getReferenceOptions(field)}
                canUseMediaLibrary={canUseMediaLibrary}
              />
              {canEditRelations &&
              (field.type === "relation" ||
                field.type === "media" ||
                field.type === "contentItem" ||
                field.type === "page") &&
              getReferenceOptions(field).length === 0 ? (
                <small>
                  No selectable {relationTargetTypeLabel(field)} records are
                  available yet.
                </small>
              ) : null}
            </label>
          ))
      ) : (
        <p>
          This content area has no editable fields yet. Ask a super admin to add
          guided fields first.
        </p>
      )}
      <fieldset>
        <legend>Revision history</legend>
        {revisions.length === 0 ? <small>No revisions yet.</small> : null}
        <ul>
          {revisions.map((revision) => (
            <li key={revision.id}>
              {new Date(revision.createdAt).toLocaleString()}{" "}
              {revision.revisionNote ?? "Snapshot"}
              <button
                type="button"
                onClick={() => {
                  const confirmation = window.confirm(
                    "Restore this revision? Current entry data will be replaced.",
                  );
                  if (!confirmation) {
                    return;
                  }
                  void onRestoreRevision(revision.id);
                }}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
      {canAccessAdvancedSettings ? (
        WORKFLOW_ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={!canUseWorkflowAction(userRole, action.key)}
            onClick={() => {
              setWorkflowStatus(action.key);
              void submit(action.key);
            }}
          >
            {action.label}
          </button>
        ))
      ) : (
        <button type="submit">Save content</button>
      )}
      <button type="button" onClick={() => void onDuplicate(item.id)}>
        Duplicate item
      </button>
      <button type="button" onClick={() => void onDelete(item.id)}>
        Delete
      </button>
    </form>
  );
}

export function ContentAdminClient({
  canManageContentTypes,
  initialContentTypes,
  initialItems,
  initialContentTypeId,
  initialHasNextPage,
  pageSize,
  canUseMediaLibrary,
  canEditSlug,
  canEditRelations,
  initialSelectedTypeSlug,
  userRole,
}: Props) {
  const isSimpleMode = userRole === "editor";
  const canAccessAdvancedSettings = !isSimpleMode;
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
        initialContentTypeId ? [[initialContentTypeId, initialItems]] : [],
      ),
  );
  const [offsetByType, setOffsetByType] = React.useState(
    () => new Map(initialContentTypeId ? [[initialContentTypeId, 0]] : []),
  );
  const [hasNextByType, setHasNextByType] = React.useState(
    () =>
      new Map(
        initialContentTypeId
          ? [[initialContentTypeId, initialHasNextPage]]
          : [],
      ),
  );
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [selectedTypeId, setSelectedTypeId] = React.useState(() => {
    const preferredType = initialSelectedTypeSlug
      ? initialContentTypes.find(
          (type) => type.slug === initialSelectedTypeSlug,
        )
      : null;
    return preferredType?.id ?? initialContentTypes[0]?.id ?? "";
  });
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
    isPublic: true,
    fields: [],
  });
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<AdminPageOption[]>([]);
  const [media, setMedia] = React.useState<AdminMediaOption[]>([]);
  const selectedType =
    contentTypes.find((type) => type.id === selectedTypeId) ?? null;
  const selectedItems = selectedType
    ? (itemsByType.get(selectedType.id) ?? [])
    : [];
  const selectedOffset = selectedType
    ? (offsetByType.get(selectedType.id) ?? 0)
    : 0;
  const selectedHasNext = selectedType
    ? (hasNextByType.get(selectedType.id) ?? false)
    : false;

  React.useEffect(() => {
    let active = true;

    void fetch("/api/admin/pages", { cache: "no-store" })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<AdminPageOption[]>)
          : Promise.resolve([] as AdminPageOption[]),
      )
      .then((items) => {
        if (active) {
          setPages(items);
        }
      })
      .catch(() => {
        if (active) {
          setPages([]);
        }
      });

    if (canUseMediaLibrary) {
      void fetch("/api/admin/media", { cache: "no-store" })
        .then((res) =>
          res.ok
            ? (res.json() as Promise<AdminMediaOption[]>)
            : Promise.resolve([] as AdminMediaOption[]),
        )
        .then((items) => {
          if (active) {
            setMedia(items);
          }
        })
        .catch(() => {
          if (active) {
            setMedia([]);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [canUseMediaLibrary]);

  function getReferenceOptions(
    field: AdminContentFieldDefinition,
  ): ReferenceOption[] {
    if (field.type === "page") {
      return pages.map((page) => ({
        id: page.id,
        label: page.title,
        hint: `/${page.slug}`,
        typeLabel: "Page",
      }));
    }

    if (field.type === "media") {
      return media.map((item) => ({
        id: item.id,
        label: item.alt?.trim() || item.url,
        hint: item.url,
        typeLabel: "Media",
        previewUrl: item.url,
        filename: item.url.split("/").pop() ?? item.url,
        altText: item.alt ?? null,
      }));
    }

    const targetSlug = field.relation?.targetSlug;
    if (!targetSlug) return [];

    const targetType = contentTypes.find((entry) => entry.slug === targetSlug);
    if (!targetType) return [];

    const options = itemsByType.get(targetType.id) ?? [];
    return options.map((item) => ({
      id: item.id,
      label: item.title,
      hint: item.slug,
      typeLabel: targetType.name,
    }));
  }

  async function loadItemsPage(contentTypeId: string, offset: number) {
    setLoadingItems(true);
    const res = await fetch(
      `/api/admin/content-items?contentTypeId=${encodeURIComponent(contentTypeId)}&offset=${offset}&limit=${pageSize + 1}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setLoadingItems(false);
      return;
    }
    const batch = (await res.json()) as AdminContentItem[];
    setItemsByType((curr) =>
      new Map(curr).set(contentTypeId, batch.slice(0, pageSize)),
    );
    setOffsetByType((curr) => new Map(curr).set(contentTypeId, offset));
    setHasNextByType((curr) =>
      new Map(curr).set(contentTypeId, batch.length > pageSize),
    );
    setLoadingItems(false);
  }

  async function refreshItems(contentTypeId: string) {
    const offset = offsetByType.get(contentTypeId) ?? 0;
    await loadItemsPage(contentTypeId, offset);
  }

  async function saveContentType(draft: ContentTypeDraft) {
    setError(null);
    setStatus(null);

    const payload = {
      name: draft.name.trim(),
      slug: normalizeSlug(draft.slug),
      description: draft.description.trim(),
      isPublic: draft.isPublic,
      fields: draft.fields,
    };

    if (!payload.name) {
      setError("Content model name is required before saving.");
      return;
    }

    if (!payload.slug || !isValidSlug(payload.slug)) {
      setError(
        "Content model URL slug can use only lowercase letters, numbers, and single hyphens.",
      );
      return;
    }

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
      const data = await res.json().catch(() => null);
      setError(
        describeApiError(
          "We could not save this content setup. Check required fields and slug conflicts, then try again.",
          data,
        ),
      );
      return;
    }

    const next = (await res.json()) as AdminContentType;
    setContentTypes((curr) => {
      const exists = curr.some((entry) => entry.id === next.id);
      return exists
        ? curr.map((entry) => (entry.id === next.id ? next : entry))
        : [next, ...curr];
    });
    setContentTypeDrafts((curr) => ({
      ...curr,
      [next.id]: toContentTypeDraft(next),
    }));
    setCreateDrafts((curr) => ({ ...curr, [next.id]: emptyDraft(next) }));
    setSelectedTypeId(next.id);
    setNewTypeDraft({
      name: "",
      slug: "",
      description: "",
      isPublic: true,
      fields: [],
    });
    setStatus("Content model saved.");
  }

  async function deleteContentType(id: string) {
    const confirmation = window.prompt(
      "To permanently delete this content setup, type DELETE.",
    );
    if (confirmation !== "DELETE") {
      setStatus("Delete cancelled. The content setup is unchanged.");
      return;
    }

    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/content-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        describeApiError(
          "We could not delete this content setup yet. Delete or move its entries first.",
          data,
        ),
      );
      return;
    }

    setContentTypes((curr) => curr.filter((entry) => entry.id !== id));
    setItemsByType((curr) => {
      const next = new Map(curr);
      next.delete(id);
      return next;
    });
    setOffsetByType((curr) => {
      const next = new Map(curr);
      next.delete(id);
      return next;
    });
    setHasNextByType((curr) => {
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
    workflowStatus: WorkflowStatus;
    publishAt: string | null;
    unpublishAt: string | null;
    data: Record<string, unknown>;
  }) {
    if (!selectedType) return;
    setError(null);
    setStatus(null);

    const trimmedTitle = payload.title.trim();
    if (!trimmedTitle) {
      setError("Entry title is required before saving.");
      return;
    }

    if (!payload.slug || !isValidSlug(payload.slug)) {
      setError(
        "Entry slug can use only lowercase letters, numbers, and single hyphens.",
      );
      return;
    }

    if (payload.id) {
      const existing = selectedItems.find((entry) => entry.id === payload.id);
      if (existing) {
        const previousSlug = normalizeSlug(existing.slug);
        const nextSlug = normalizeSlug(payload.slug);
        if (previousSlug !== nextSlug) {
          if (!canEditSlug) {
            setError("Only admins and superadmins can change entry URLs.");
            return;
          }
        }

        const impactSummaryItems: ImpactSummaryItem[] = [];
        if (previousSlug !== nextSlug) {
          impactSummaryItems.push({
            label: "change the public URL",
            oldValue: `/${selectedType.slug}/${previousSlug}`,
            newValue: `/${selectedType.slug}/${nextSlug}`,
          });
          impactSummaryItems.push({
            label: "affect redirects or inbound links",
          });
        }

        if ((existing.canonicalUrl ?? null) !== payload.canonicalUrl) {
          impactSummaryItems.push({
            label: "change canonical URL used by search engines",
            oldValue: formatImpactValue(existing.canonicalUrl),
            newValue: formatImpactValue(payload.canonicalUrl),
          });
        }

        if (existing.noIndex !== payload.noIndex) {
          impactSummaryItems.push({
            label: "affect search engine indexing",
            oldValue: existing.noIndex ? "noindex" : "index",
            newValue: payload.noIndex ? "noindex" : "index",
          });
        }

        if (existing.published !== payload.published) {
          impactSummaryItems.push({
            label: "change whether the page is publicly visible",
            oldValue: existing.published ? "public" : "hidden",
            newValue: payload.published ? "public" : "hidden",
          });
        }

        if (
          (existing.publishAt ?? null) !== payload.publishAt ||
          (existing.unpublishAt ?? null) !== payload.unpublishAt
        ) {
          impactSummaryItems.push({
            label: "change scheduled visibility",
            oldValue: `publishAt=${formatImpactValue(existing.publishAt)}, unpublishAt=${formatImpactValue(existing.unpublishAt)}`,
            newValue: `publishAt=${formatImpactValue(payload.publishAt)}, unpublishAt=${formatImpactValue(payload.unpublishAt)}`,
          });
        }

        if (existing.workflowStatus !== payload.workflowStatus) {
          impactSummaryItems.push({
            label: "change workflow status",
            oldValue: workflowStatusLabel(existing.workflowStatus),
            newValue: workflowStatusLabel(payload.workflowStatus),
          });
        }

        if (impactSummaryItems.length > 0) {
          const confirmed = window.confirm(
            formatImpactSummaryMessage(impactSummaryItems),
          );
          if (!confirmed) {
            setStatus("Save cancelled.");
            return;
          }
        }
      }
    }

    const validationError = validateContentItemInput(
      selectedType.fields,
      payload.data,
      getReferenceOptions,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    const requestPayload = {
      contentTypeId: selectedType.id,
      ...payload,
      title: trimmedTitle,
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
      const data = await res.json().catch(() => null);
      setError(
        describeApiError(
          "We could not save this entry. Please review highlighted fields and try again.",
          data,
        ),
      );
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

  async function duplicateContentItem(id: string) {
    if (!selectedType) return;

    const item = selectedItems.find((entry) => entry.id === id);
    const confirmation = window.confirm(
      `Duplicate "${item?.title ?? "this entry"}"? A new draft copy will be created.`,
    );
    if (!confirmation) {
      setStatus("Duplication cancelled. The entry is unchanged.");
      return;
    }

    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/content-items/${id}/duplicate`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        describeApiError(
          "We could not duplicate this entry right now. Please try again.",
          data,
        ),
      );
      return;
    }

    await refreshItems(selectedType.id);
    setStatus("Draft copy created.");
  }

  async function deleteContentItem(id: string) {
    if (!selectedType) return;

    const confirmation = window.prompt(
      "To permanently delete this content entry, type DELETE.",
    );
    if (confirmation !== "DELETE") {
      setStatus("Delete cancelled. The entry is unchanged.");
      return;
    }

    setError(null);
    setStatus(null);
    const res = await fetch(`/api/admin/content-items/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        describeApiError(
          "We could not delete this entry right now. Please try again.",
          data,
        ),
      );
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
      <p>
        Editing mode: <strong>{isSimpleMode ? "Simple mode" : "Advanced mode"}</strong>
      </p>
      <p>
        Day-to-day editing happens below. Schema and field design tools are
        separated into a protected setup area.
      </p>
      {error && <p>{error}</p>}
      {status && <p>{status}</p>}

      <h2>Content editing</h2>
      <div>
        {contentTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setSelectedTypeId(type.id);
              if (!itemsByType.has(type.id)) {
                void loadItemsPage(type.id, 0);
              }
            }}
          >
            {type.name}
          </button>
        ))}
      </div>

      {!canManageContentTypes && (
        <p>
          Content setup is managed by super admins. You can safely focus on
          editing entries.
        </p>
      )}

      {canManageContentTypes && (
        <>
          <h2>Content setup</h2>
          {contentTypes.map((type) => {
            const draft =
              contentTypeDrafts[type.id] ?? toContentTypeDraft(type);
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
                <label>
                  Public archive and item routes
                  <input
                    type="checkbox"
                    checked={draft.isPublic}
                    onChange={(e) =>
                      setContentTypeDrafts((curr) => ({
                        ...curr,
                        [type.id]: { ...draft, isPublic: e.target.checked },
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
                          fields: draft.fields.filter(
                            (_, idx) => idx !== index,
                          ),
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
                <button
                  type="button"
                  onClick={() => void saveContentType(draft)}
                >
                  Save content setup
                </button>
                <button
                  type="button"
                  onClick={() => void deleteContentType(type.id)}
                >
                  Delete content setup
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
                  setNewTypeDraft((curr) => ({
                    ...curr,
                    description: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              Public archive and item routes
              <input
                type="checkbox"
                checked={newTypeDraft.isPublic}
                onChange={(e) =>
                  setNewTypeDraft((curr) => ({
                    ...curr,
                    isPublic: e.target.checked,
                  }))
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
            <button
              type="button"
              onClick={() => void saveContentType(newTypeDraft)}
            >
              Create content area
            </button>
            <button
              type="button"
              onClick={() => {
                const confirmation = window.confirm(
                  "Reset the new content area form? Unsaved changes will be lost.",
                );
                if (!confirmation) {
                  return;
                }
                setNewTypeDraft({
                  name: "",
                  slug: "",
                  description: "",
                  isPublic: true,
                  fields: [],
                });
                setStatus("New content area form reset.");
                setError(null);
              }}
            >
              Reset form
            </button>
          </article>
        </>
      )}

      {selectedType && createDraft && (
        <>
          <h2>{selectedType.name} entries</h2>
          <p>{selectedType.description}</p>
          <p>
            Showing {selectedOffset + 1}-{selectedOffset + selectedItems.length}
          </p>
          <div>
            <button
              type="button"
              onClick={() =>
                void loadItemsPage(
                  selectedType.id,
                  Math.max(0, selectedOffset - pageSize),
                )
              }
              disabled={loadingItems || selectedOffset === 0}
            >
              Previous page
            </button>
            <button
              type="button"
              onClick={() =>
                void loadItemsPage(selectedType.id, selectedOffset + pageSize)
              }
              disabled={loadingItems || !selectedHasNext}
            >
              Next page
            </button>
          </div>
          {selectedItems.map((item) => (
            <ContentItemEditor
              key={item.id}
              item={item}
              contentType={selectedType}
              onSave={(payload) => saveContentItem(payload)}
              onDelete={deleteContentItem}
              onDuplicate={duplicateContentItem}
              getReferenceOptions={getReferenceOptions}
              canUseMediaLibrary={canUseMediaLibrary}
              canEditSlug={canEditSlug}
              canEditRelations={canEditRelations}
              userRole={userRole}
              onRestoreRevision={async (revisionId) => {
                const res = await fetch(
                  `/api/admin/content-items/${item.id}/revisions/${revisionId}/restore`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      revisionNote: "Restored from revision history",
                    }),
                  },
                );

                if (!res.ok) {
                  const payload = (await res
                    .json()
                    .catch(() => null)) as unknown;
                  throw new Error(
                    describeApiError("Failed to restore revision.", payload),
                  );
                }

                setStatus("Entry revision restored.");
                await loadItemsPage(selectedType.id, selectedOffset);
              }}
            />
          ))}

          <h3>Create new entry</h3>
          <p>
            New entries start as <strong>Draft</strong>. Save, then publish when
            ready. Public preview links appear after saving and only for public
            content types.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveContentItem({
                title: createDraft.title,
                slug: canEditSlug
                  ? normalizeSlug(createDraft.slug)
                  : normalizeSlug(createDraft.title),
                seoTitle: createDraft.seoTitle.trim() || null,
                seoDescription: createDraft.seoDescription.trim() || null,
                seoImage: createDraft.seoImage.trim() || null,
                canonicalUrl: createDraft.canonicalUrl.trim() || null,
                noIndex: createDraft.noIndex,
                published: createDraft.workflowStatus === "published",
                workflowStatus: createDraft.workflowStatus,
                publishAt: toIsoDateTimeOrNull(createDraft.publishAt),
                unpublishAt: toIsoDateTimeOrNull(createDraft.unpublishAt),
                data: buildDataFromFields(
                  selectedType.fields,
                  createDraft.values,
                ),
              });
            }}
          >
            <label>
              Title
              <input
                placeholder="Internal title editors will recognize"
                value={createDraft.title}
                onChange={(e) =>
                  setCreateDrafts((curr) => ({
                    ...curr,
                    [selectedType.id]: {
                      ...createDraft,
                      title: e.target.value,
                    },
                  }))
                }
                required
              />
            </label>
            {canEditSlug ? (
              <>
                <label>
                  Web address (slug)
                  <input
                    placeholder="about-us"
                    value={createDraft.slug}
                    onChange={(e) =>
                      setCreateDrafts((curr) => ({
                        ...curr,
                        [selectedType.id]: {
                          ...createDraft,
                          slug: e.target.value,
                        },
                      }))
                    }
                    required
                  />
                </label>
                <small>
                  If you change a slug after publishing, remember to configure a
                  redirect from the old URL.
                </small>
              </>
            ) : (
              <p>
                Web addresses are managed by admins when entries are created.
              </p>
            )}
            {canAccessAdvancedSettings ? (
              <details>
                <summary>Advanced settings</summary>
                <label>
                  Publish date/time
                  <input
                    type="datetime-local"
                    value={createDraft.publishAt}
                    onChange={(e) =>
                      setCreateDrafts((curr) => ({
                        ...curr,
                        [selectedType.id]: {
                          ...createDraft,
                          publishAt: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  Unpublish date/time (optional)
                  <input
                    type="datetime-local"
                    value={createDraft.unpublishAt}
                    onChange={(e) =>
                      setCreateDrafts((curr) => ({
                        ...curr,
                        [selectedType.id]: {
                          ...createDraft,
                          unpublishAt: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </details>
            ) : null}
            {selectedType.fields
              .filter(
                (field) =>
                  canEditRelations ||
                  (field.type !== "relation" &&
                    field.type !== "media" &&
                    field.type !== "contentItem" &&
                    field.type !== "page"),
              )
              .map((field) => (
                <label key={field.key}>
                  {getFieldLabel(field)}
                  {field.description ? (
                    <small>{field.description}</small>
                  ) : null}
                  {field.helpText ? <small>{field.helpText}</small> : null}
                  <ContentFieldInput
                    field={field}
                    value={createDraft.values[field.key] ?? ""}
                    onChange={(nextValue) =>
                      setCreateDrafts((curr) => ({
                        ...curr,
                        [selectedType.id]: {
                          ...createDraft,
                          values: {
                            ...createDraft.values,
                            [field.key]: nextValue,
                          },
                        },
                      }))
                    }
                    options={getReferenceOptions(field)}
                    canUseMediaLibrary={canUseMediaLibrary}
                  />
                  {canEditRelations &&
                  (field.type === "relation" ||
                    field.type === "media" ||
                    field.type === "contentItem" ||
                    field.type === "page") &&
                  getReferenceOptions(field).length === 0 ? (
                    <small>
                      No selectable {relationTargetTypeLabel(field)} records are
                      available yet.
                    </small>
                  ) : null}
                </label>
              ))}
            {canAccessAdvancedSettings ? (
              <>
                <div>
                  Current workflow:{" "}
                  <strong>{workflowStatusLabel(createDraft.workflowStatus)}</strong>
                </div>
                {WORKFLOW_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    disabled={!canUseWorkflowAction(userRole, action.key)}
                    onClick={() =>
                      setCreateDrafts((curr) => ({
                        ...curr,
                        [selectedType.id]: {
                          ...createDraft,
                          workflowStatus: action.key,
                        },
                      }))
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </>
            ) : null}
            <button type="submit">Create entry</button>
          </form>
        </>
      )}
    </section>
  );
}
