"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { AdminPage, AdminPageBlockType } from "../../../../lib/admin/pages";

const BLOCK_TYPES: AdminPageBlockType[] = [
  "hero",
  "rich_text",
  "image",
  "cta",
  "news_list",
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

export function PageEditorClient({ initialPage }: { initialPage: AdminPage | null }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialPage?.title ?? "");
  const [slug, setSlug] = React.useState(initialPage?.slug ?? "");
  const [published, setPublished] = React.useState(initialPage?.published ?? false);
  const [blocks, setBlocks] = React.useState<EditableBlock[]>(toEditableBlocks(initialPage));
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  function addBlock(type: AdminPageBlockType) {
    setBlocks((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${current.length}`,
        type,
        dataJson: "{}",
      },
    ]);
  }

  function updateBlock(index: number, patch: Partial<EditableBlock>) {
    setBlocks((current) =>
      current.map((block, idx) => (idx === index ? { ...block, ...patch } : block)),
    );
  }

  function removeBlock(index: number) {
    setBlocks((current) => current.filter((_, idx) => idx !== index));
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
      setError("Slug is required and can contain only letters, numbers, and hyphens.");
      return;
    }

    const parsedBlocks: Array<{ type: AdminPageBlockType; data: Record<string, unknown>; order: number }> = [];

    for (const [index, block] of blocks.entries()) {
      try {
        const parsed = JSON.parse(block.dataJson) as unknown;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setError(`Block #${index + 1} must be a JSON object.`);
          return;
        }

        parsedBlocks.push({
          type: block.type,
          data: parsed as Record<string, unknown>,
          order: index,
        });
      } catch {
        setError(`Block #${index + 1} has invalid JSON.`);
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

      const endpoint = initialPage ? `/api/admin/pages/${initialPage.id}` : "/api/admin/pages";
      const method = initialPage ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = (data && (data.message || data.error)) || "Unable to save page.";
        setError(typeof message === "string" ? message : "Unable to save page.");
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

    const confirmed = window.confirm("Delete this page?");
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
        setError("Unable to delete page.");
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

  return (
    <section className="page-editor">
      <div className="page-editor__header">
        <Link href="/admin/pages" className="page-editor__back">
          ← Back to pages
        </Link>
        <h1>{initialPage ? "Edit page" : "Create page"}</h1>
      </div>

      <form className="page-editor__form" onSubmit={savePage}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label>
          Slug
          <input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} required />
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
            <h2>Blocks</h2>
            <div className="page-editor__block-type-buttons">
              {BLOCK_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => addBlock(type)}>
                  + {type}
                </button>
              ))}
            </div>
          </div>

          {blocks.length === 0 && <p>No blocks yet. Add one to start.</p>}

          {blocks.map((block, index) => (
            <article key={block.id} className="page-editor__block">
              <div className="page-editor__block-toolbar">
                <strong>#{index + 1}</strong>
                <div>
                  <button type="button" onClick={() => moveBlock(index, -1)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveBlock(index, 1)}>
                    ↓
                  </button>
                  <button type="button" onClick={() => removeBlock(index)}>
                    Delete
                  </button>
                </div>
              </div>

              <label>
                Type
                <select
                  value={block.type}
                  onChange={(e) =>
                    updateBlock(index, { type: e.target.value as AdminPageBlockType })
                  }
                >
                  {BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Data (JSON)
                <textarea
                  rows={8}
                  value={block.dataJson}
                  onChange={(e) => updateBlock(index, { dataJson: e.target.value })}
                />
              </label>
            </article>
          ))}
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
