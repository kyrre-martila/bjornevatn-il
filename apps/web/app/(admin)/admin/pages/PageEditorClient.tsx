"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import type {
  AdminPage,
  AdminPageBlockType,
} from "../../../../lib/admin/pages";

type AdminMedia = {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

const BLOCK_TYPES: Array<{ value: AdminPageBlockType; label: string }> = [
  { value: "hero", label: "Hero" },
  { value: "rich_text", label: "Rich text" },
  { value: "image", label: "Image" },
  { value: "cta", label: "Call to action" },
  { value: "news_list", label: "News list" },
];

const BLOCK_TYPE_DESCRIPTIONS: Record<AdminPageBlockType, string> = {
  hero: "Top-of-page section with heading, supporting text, and optional image.",
  rich_text: "Long-form text content block.",
  image: "Standalone image with alt text for accessibility.",
  cta: "Call to action with message and button link.",
  news_list: "Auto-generated list of recent news items.",
};

type BlockFieldWidget =
  | "text"
  | "textarea"
  | "rich_text"
  | "image"
  | "date"
  | "boolean"
  | "relation";

type BlockFieldSchema = {
  key: string;
  label: string;
  widget: BlockFieldWidget;
  required?: boolean;
  description?: string;
  placeholder?: string;
  relationOptions?: Array<{ value: string; label: string }>;
};

type EditableBlock = {
  id: string;
  type: AdminPageBlockType;
  data: Record<string, unknown>;
};

const BLOCK_SCHEMAS: Record<AdminPageBlockType, BlockFieldSchema[]> = {
  hero: [
    {
      key: "heading",
      label: "Heading",
      widget: "text",
      required: true,
      placeholder: "Welcome to our site",
    },
    {
      key: "text",
      label: "Supporting text",
      widget: "textarea",
      placeholder: "One short paragraph",
    },
    {
      key: "imageUrl",
      label: "Hero image URL",
      widget: "image",
      description: "Use media library to fill this automatically.",
    },
    { key: "imageWidth", label: "Image width", widget: "text" },
    { key: "imageHeight", label: "Image height", widget: "text" },
  ],
  rich_text: [
    {
      key: "body",
      label: "Body content",
      widget: "rich_text",
      required: true,
      placeholder: "Add page copy here",
    },
  ],
  image: [
    {
      key: "src",
      label: "Image URL",
      widget: "image",
      required: true,
      description: "Use media library to avoid copy/paste errors.",
    },
    {
      key: "alt",
      label: "Image description (alt text)",
      widget: "text",
      placeholder: "Describe the image for accessibility",
    },
    { key: "width", label: "Width", widget: "text" },
    { key: "height", label: "Height", widget: "text" },
  ],
  cta: [
    { key: "heading", label: "Heading", widget: "text", required: true },
    { key: "text", label: "Supporting text", widget: "textarea" },
    {
      key: "buttonText",
      label: "Button label",
      widget: "text",
      placeholder: "Read more",
    },
    {
      key: "href",
      label: "Button link",
      widget: "text",
      placeholder: "/contact",
    },
  ],
  news_list: [
    {
      key: "heading",
      label: "Section heading",
      widget: "text",
      placeholder: "Latest news",
    },
    {
      key: "limit",
      label: "Number of articles",
      widget: "text",
      description: "How many recent news items to show.",
    },
  ],
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toEditableBlocks(page: AdminPage | null): EditableBlock[] {
  if (!page) {
    return [];
  }

  return page.blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({
      id: block.id || `block-${index}`,
      type: block.type,
      data: block.data,
    }));
}

function getBlockTypeLabel(type: AdminPageBlockType) {
  return BLOCK_TYPES.find((item) => item.value === type)?.label ?? type;
}

function defaultBlockData(type: AdminPageBlockType): Record<string, unknown> {
  if (type === "hero") {
    return { heading: "", text: "", imageUrl: "" };
  }

  if (type === "image") {
    return { src: "", alt: "" };
  }

  if (type === "cta") {
    return { heading: "", text: "", buttonText: "", href: "" };
  }

  if (type === "news_list") {
    return { heading: "Latest news", limit: 3 };
  }

  return { body: "" };
}

export function PageEditorClient({
  initialPage,
  canManageStructure,
  canEditRawJson,
}: {
  initialPage: AdminPage | null;
  canManageStructure: boolean;
  canEditRawJson: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialPage?.title ?? "");
  const [slug, setSlug] = React.useState(initialPage?.slug ?? "");
  const [seoTitle, setSeoTitle] = React.useState(initialPage?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = React.useState(
    initialPage?.seoDescription ?? "",
  );
  const [seoImage, setSeoImage] = React.useState(initialPage?.seoImage ?? "");
  const [canonicalUrl, setCanonicalUrl] = React.useState(
    initialPage?.canonicalUrl ?? "",
  );
  const [noIndex, setNoIndex] = React.useState(initialPage?.noIndex ?? false);
  const [published, setPublished] = React.useState(
    initialPage?.published ?? false,
  );
  const [blocks, setBlocks] = React.useState<EditableBlock[]>(
    toEditableBlocks(initialPage),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = React.useState<string | null>(
    initialPage?.blocks[0]?.id ?? null,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [media, setMedia] = React.useState<AdminMedia[]>([]);
  const [nextBlockType, setNextBlockType] = React.useState<AdminPageBlockType>(
    "hero",
  );

  React.useEffect(() => {
    let active = true;
    void fetch("/api/admin/media", { cache: "no-store" })
      .then((res) =>
        res.ok ? (res.json() as Promise<AdminMedia[]>) : Promise.resolve([]),
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

    return () => {
      active = false;
    };
  }, []);

  function addBlock(type: AdminPageBlockType) {
    const nextId = `new-${Date.now()}-${blocks.length}`;
    setBlocks((current) => [
      ...current,
      {
        id: nextId,
        type,
        data: defaultBlockData(type),
      },
    ]);
    setActiveBlockId(nextId);
    setStatus(`Added ${getBlockTypeLabel(type)} block.`);
    setError(null);
  }

  function updateBlock(index: number, patch: Partial<EditableBlock>) {
    setBlocks((current) =>
      current.map((block, idx) =>
        idx === index ? { ...block, ...patch } : block,
      ),
    );
  }

  function removeBlock(index: number) {
    setBlocks((current) => {
      const removed = current[index];
      const next = current.filter((_, idx) => idx !== index);
      if (removed && removed.id === activeBlockId) {
        setActiveBlockId(next[index]?.id ?? next[index - 1]?.id ?? null);
      }
      return next;
    });
    setStatus(`Removed block #${index + 1}.`);
    setError(null);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const updated = current.slice();
      const [moved] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
    setStatus(`Moved block to position ${index + direction + 1}.`);
    setError(null);
  }

  function updateBlockDataField(index: number, key: string, value: unknown) {
    const block = blocks[index];
    if (!block) return;

    updateBlock(index, {
      data: {
        ...block.data,
        [key]: value,
      },
    });
    setError(null);
  }

  function getSchemaForBlock(type: AdminPageBlockType): BlockFieldSchema[] {
    return BLOCK_SCHEMAS[type] ?? [];
  }

  function updateBlockDataFromJson(index: number, value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setError("Advanced JSON must be an object.");
        return;
      }

      updateBlock(index, { data: parsed as Record<string, unknown> });
      setError(null);
    } catch {
      setError("Advanced JSON is invalid. Fix it before saving.");
    }
  }

  function getFieldValueAsString(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function setBlockMedia(index: number, selectedMediaId: string) {
    const selected = media.find((item) => item.id === selectedMediaId);
    if (!selected) {
      return;
    }

    try {
      const current = blocks[index]?.data ?? {};
      const nextData: Record<string, unknown> = { ...current };

      if (blocks[index]?.type === "image") {
        nextData.src = selected.url;
        nextData.alt = selected.alt;
        if (selected.width) {
          nextData.width = selected.width;
        }
        if (selected.height) {
          nextData.height = selected.height;
        }
      }

      if (blocks[index]?.type === "hero") {
        nextData.imageUrl = selected.url;
        if (selected.width) {
          nextData.imageWidth = selected.width;
        }
        if (selected.height) {
          nextData.imageHeight = selected.height;
        }
      }

      updateBlock(index, { data: nextData });
      setStatus("Media selected for block.");
      setError(null);
    } catch {
      setError(`Block #${index + 1} has invalid block data.`);
    }
  }

  async function savePage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const trimmedTitle = title.trim();
    const normalizedSlug = normalizeSlug(slug);

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!normalizedSlug) {
      setError(
        "Slug is required and can contain only letters, numbers, and hyphens.",
      );
      return;
    }

    const parsedBlocks: Array<{
      type: AdminPageBlockType;
      data: Record<string, unknown>;
      order: number;
    }> = [];

    for (const [index, block] of blocks.entries()) {
      if (
        typeof block.data !== "object" ||
        block.data === null ||
        Array.isArray(block.data)
      ) {
        setError(
          `Block #${index + 1} (${getBlockTypeLabel(block.type)}) has invalid data.`,
        );
        setActiveBlockId(block.id);
        return;
      }

      const schema = getSchemaForBlock(block.type);
      for (const field of schema) {
        const rawValue = block.data[field.key];
        const textValue =
          typeof rawValue === "string"
            ? rawValue.trim()
            : rawValue === undefined || rawValue === null
              ? ""
              : String(rawValue).trim();

        if (field.required && !textValue) {
          setError(
            `Block #${index + 1} (${getBlockTypeLabel(block.type)}): ${field.label} is required.`,
          );
          setActiveBlockId(block.id);
          return;
        }

        if (field.widget === "date" && textValue && Number.isNaN(Date.parse(textValue))) {
          setError(
            `Block #${index + 1} (${getBlockTypeLabel(block.type)}): ${field.label} must be a valid date.`,
          );
          setActiveBlockId(block.id);
          return;
        }
      }

      parsedBlocks.push({
        type: block.type,
        data: block.data,
        order: index,
      });
    }

    setIsSaving(true);

    try {
      const payload = {
        title: trimmedTitle,
        slug: normalizedSlug,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        seoImage: seoImage.trim() || null,
        canonicalUrl: canonicalUrl.trim() || null,
        noIndex,
        published,
        blocks: parsedBlocks,
      };

      const endpoint = initialPage
        ? `/api/admin/pages/${initialPage.id}`
        : "/api/admin/pages";
      const method = initialPage ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.message || data.error)) || "Unable to save page.";
        setError(
          typeof message === "string" ? message : "Unable to save page.",
        );
        return;
      }

      const page = (await res.json()) as AdminPage;
      setStatus(
        initialPage
          ? "Page changes saved successfully."
          : "Page created successfully.",
      );

      if (!initialPage) {
        router.push(`/admin/pages/${page.id}`);
        router.refresh();
        return;
      }

      router.refresh();
    } catch {
      setError("Network error while saving page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePage() {
    if (!initialPage) {
      return;
    }

    const confirmation = window.prompt(
      `To permanently delete \"${initialPage.title}\", type DELETE.`,
    );
    if (confirmation !== "DELETE") {
      setStatus("Delete cancelled. The page is unchanged.");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch(`/api/admin/pages/${initialPage.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data && (data.message || data.error)) || "Unable to delete page.";
        setError(
          typeof message === "string" ? message : "Unable to delete page.",
        );
        return;
      }

      router.push("/admin/pages");
      router.refresh();
    } catch {
      setError("Network error while deleting page.");
    } finally {
      setIsDeleting(false);
    }
  }

  const activeBlockIndex = blocks.findIndex(
    (block) => block.id === activeBlockId,
  );
  const activeBlock = activeBlockIndex >= 0 ? blocks[activeBlockIndex] : null;
  const activeBlockData = activeBlock?.data ?? null;
  const activeBlockJson = activeBlock
    ? JSON.stringify(activeBlock.data, null, 2)
    : "";

  return (
    <section className="page-editor">
      <div className="page-editor__header">
        <Link href="/admin/pages" className="page-editor__back">
          ← Back to pages
        </Link>
        <h1>{initialPage ? "Edit page" : "Create page"}</h1>
        <p className="page-editor__help">
          Use guided fields to edit what visitors see. Raw JSON is restricted to super admins as an advanced fallback.
        </p>
      </div>

      <form className="page-editor__form" onSubmit={savePage}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label>
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(normalizeSlug(e.target.value))}
            required
          />
          <small className="page-editor__field-help">
            URL preview: /page/{normalizeSlug(slug) || "your-page"}
          </small>
        </label>

        <label className="page-editor__checkbox">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published
        </label>

        <fieldset className="page-editor__seo">
          <legend>SEO</legend>
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
          <label>
            SEO Image
            <input
              value={seoImage}
              onChange={(e) => setSeoImage(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            Canonical URL
            <input
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="page-editor__checkbox">
            <input
              type="checkbox"
              checked={noIndex}
              onChange={(e) => setNoIndex(e.target.checked)}
            />
            Noindex
          </label>
        </fieldset>

        <div className="page-editor__blocks">
          <div className="page-editor__blocks-header">
            <h2>Page blocks ({blocks.length})</h2>
            {canManageStructure && (
              <div className="page-editor__block-type-buttons">
                <select
                  value={nextBlockType}
                  onChange={(e) =>
                    setNextBlockType(e.target.value as AdminPageBlockType)
                  }
                >
                  {BLOCK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => addBlock(nextBlockType)}>
                  Add block
                </button>
              </div>
            )}
          </div>

          <p className="page-editor__help">
            Blocks render top to bottom. Select a block to edit visitor-facing
            content.
          </p>

          <div className="page-editor__block-layout">
            <div
              className="page-editor__block-list"
              role="list"
              aria-label="Block list"
            >
              {blocks.length === 0 && <p>No blocks yet. Add one to start.</p>}

              {blocks.map((block, index) => {
                const isActive = activeBlock?.id === block.id;

                return (
                  <article
                    key={block.id}
                    className={`page-editor__block ${isActive ? "page-editor__block--active" : ""}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="page-editor__block-summary"
                      onClick={() => setActiveBlockId(block.id)}
                    >
                      <strong>
                        Position {index + 1} of {blocks.length}
                      </strong>
                      <small>
                        {getBlockTypeLabel(block.type)} · {BLOCK_TYPE_DESCRIPTIONS[block.type]}
                      </small>
                      <span>{isActive ? "Editing" : "Select"}</span>
                    </button>
                    <div className="page-editor__block-toolbar">
                      <div>
                        {canManageStructure && (
                          <>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, -1)}
                              disabled={index === 0}
                            >
                              Move up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                            >
                              Move down
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(index)}
                            >
                              Remove block
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {activeBlock && (
              <div className="page-editor__block-editor">
                <h3>
                  Editing block #{activeBlockIndex + 1}:{" "}
                  {getBlockTypeLabel(activeBlock.type)}
                </h3>
                <p className="page-editor__field-help">
                  {BLOCK_TYPE_DESCRIPTIONS[activeBlock.type]}
                </p>

                {activeBlockData && (
                  <fieldset className="page-editor__guided-fields">
                    <legend>Guided fields</legend>
                    {getSchemaForBlock(activeBlock.type).map((field) => {
                      const value = activeBlockData[field.key];
                      const normalizedValue = getFieldValueAsString(value);
                      return (
                        <label key={field.key}>
                          {field.label}
                          {field.description ? (
                            <small className="page-editor__field-help">{field.description}</small>
                          ) : null}
                          {field.widget === "textarea" || field.widget === "rich_text" ? (
                            <textarea
                              rows={field.widget === "rich_text" ? 6 : 3}
                              value={normalizedValue}
                              onChange={(e) =>
                                updateBlockDataField(activeBlockIndex, field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                            />
                          ) : field.widget === "boolean" ? (
                            <select
                              value={normalizedValue || "false"}
                              onChange={(e) =>
                                updateBlockDataField(
                                  activeBlockIndex,
                                  field.key,
                                  e.target.value === "true",
                                )
                              }
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                          ) : field.widget === "relation" ? (
                            <select
                              value={normalizedValue}
                              onChange={(e) =>
                                updateBlockDataField(activeBlockIndex, field.key, e.target.value)
                              }
                            >
                              <option value="">Select an option</option>
                              {(field.relationOptions ?? []).map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.widget === "date" ? "date" : "text"}
                              value={normalizedValue}
                              onChange={(e) =>
                                updateBlockDataField(activeBlockIndex, field.key, e.target.value)
                              }
                              placeholder={field.placeholder}
                            />
                          )}
                        </label>
                      );
                    })}
                  </fieldset>
                )}

                {canManageStructure && (
                  <>
                    <label>
                      Block type
                      <select
                        value={activeBlock.type}
                        onChange={(e) =>
                          updateBlock(activeBlockIndex, {
                            type: e.target.value as AdminPageBlockType,
                            data: defaultBlockData(
                              e.target.value as AdminPageBlockType,
                            ),
                          })
                        }
                      >
                        {BLOCK_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {canEditRawJson && (
                      <label>
                        Advanced data (JSON)
                        <textarea
                          rows={14}
                          value={activeBlockJson}
                          onChange={(e) =>
                            updateBlockDataFromJson(activeBlockIndex, e.target.value)
                          }
                        />
                      </label>
                    )}
                  </>
                )}

                {(activeBlock.type === "image" ||
                  activeBlock.type === "hero") && (
                  <label>
                    Select media
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        setBlockMedia(activeBlockIndex, e.target.value)
                      }
                    >
                      <option value="">Choose from media library</option>
                      {media.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.alt || item.url}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="page-editor__error">{error}</p>}
        {status && <p className="page-editor__status">{status}</p>}

        <div className="page-editor__actions">
          <button type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : initialPage
                ? "Save changes"
                : "Create page"}
          </button>
          {initialPage && (
            <button type="button" onClick={deletePage} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete permanently"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
