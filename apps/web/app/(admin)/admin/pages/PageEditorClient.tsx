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
};

const BLOCK_TYPES: Array<{ value: AdminPageBlockType; label: string }> = [
  { value: "hero", label: "Hero" },
  { value: "rich_text", label: "Rich text" },
  { value: "image", label: "Image" },
  { value: "cta", label: "Call to action" },
  { value: "news_list", label: "News list" },
];

type EditableBlock = {
  id: string;
  type: AdminPageBlockType;
  dataJson: string;
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
      dataJson: JSON.stringify(block.data, null, 2),
    }));
}

function getBlockTypeLabel(type: AdminPageBlockType) {
  return BLOCK_TYPES.find((item) => item.value === type)?.label ?? type;
}

function defaultBlockJson(type: AdminPageBlockType): string {
  if (type === "hero") {
    return JSON.stringify({ heading: "", text: "", imageUrl: "" }, null, 2);
  }

  if (type === "image") {
    return JSON.stringify({ src: "", alt: "" }, null, 2);
  }

  if (type === "cta") {
    return JSON.stringify(
      { heading: "", text: "", buttonText: "", href: "" },
      null,
      2,
    );
  }

  if (type === "news_list") {
    return JSON.stringify({ heading: "Latest news", limit: 3 }, null, 2);
  }

  return JSON.stringify({ body: "" }, null, 2);
}

export function PageEditorClient({
  initialPage,
}: {
  initialPage: AdminPage | null;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialPage?.title ?? "");
  const [slug, setSlug] = React.useState(initialPage?.slug ?? "");
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
        dataJson: defaultBlockJson(type),
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
    setStatus("Block removed.");
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
    setStatus("Block order updated.");
    setError(null);
  }

  function setBlockMedia(index: number, selectedMediaId: string) {
    const selected = media.find((item) => item.id === selectedMediaId);
    if (!selected) {
      return;
    }

    try {
      const current = JSON.parse(blocks[index]?.dataJson ?? "{}") as Record<
        string,
        unknown
      >;
      const nextData: Record<string, unknown> = {
        ...current,
      };

      if (blocks[index]?.type === "image") {
        nextData.src = selected.url;
        nextData.alt = selected.alt;
      }

      if (blocks[index]?.type === "hero") {
        nextData.imageUrl = selected.url;
      }

      updateBlock(index, { dataJson: JSON.stringify(nextData, null, 2) });
      setStatus("Media selected for block.");
      setError(null);
    } catch {
      setError(
        `Block #${index + 1} has invalid JSON. Fix it before selecting media.`,
      );
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
      try {
        const parsed = JSON.parse(block.dataJson) as unknown;
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          setError(
            `Block #${index + 1} (${getBlockTypeLabel(block.type)}) must be a JSON object.`,
          );
          setActiveBlockId(block.id);
          return;
        }

        parsedBlocks.push({
          type: block.type,
          data: parsed as Record<string, unknown>,
          order: index,
        });
      } catch {
        setError(
          `Block #${index + 1} (${getBlockTypeLabel(block.type)}) has invalid JSON.`,
        );
        setActiveBlockId(block.id);
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        title: trimmedTitle,
        slug: normalizedSlug,
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
      setStatus("Page saved.");

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

    const confirmed = window.confirm(
      `Delete page \"${initialPage.title}\"? This cannot be undone.`,
    );
    if (!confirmed) {
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

  return (
    <section className="page-editor">
      <div className="page-editor__header">
        <Link href="/admin/pages" className="page-editor__back">
          ← Back to pages
        </Link>
        <h1>{initialPage ? "Edit page" : "Create page"}</h1>
        <p className="page-editor__help">
          Keep layout flexible with simple blocks. Edit block JSON for advanced
          fields when needed.
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

        <div className="page-editor__blocks">
          <div className="page-editor__blocks-header">
            <h2>Page blocks ({blocks.length})</h2>
            <div className="page-editor__block-type-buttons">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => addBlock(type.value)}
                >
                  + {type.label}
                </button>
              ))}
            </div>
          </div>

          <p className="page-editor__help">
            Reorder blocks with arrows. Select a block from the list to edit its
            type and JSON payload.
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
                        #{index + 1} {getBlockTypeLabel(block.type)}
                      </strong>
                      <span>{isActive ? "Editing" : "Select"}</span>
                    </button>
                    <div className="page-editor__block-toolbar">
                      <div>
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
                          Delete
                        </button>
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

                <label>
                  Type
                  <select
                    value={activeBlock.type}
                    onChange={(e) =>
                      updateBlock(activeBlockIndex, {
                        type: e.target.value as AdminPageBlockType,
                        dataJson: defaultBlockJson(
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

                <label>
                  Data (JSON)
                  <textarea
                    rows={14}
                    value={activeBlock.dataJson}
                    onChange={(e) =>
                      updateBlock(activeBlockIndex, {
                        dataJson: e.target.value,
                      })
                    }
                  />
                </label>

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
            {isSaving ? "Saving..." : "Save page"}
          </button>
          {initialPage && (
            <button type="button" onClick={deletePage} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete page"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
