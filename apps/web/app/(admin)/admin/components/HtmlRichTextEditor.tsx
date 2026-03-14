"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

type HtmlRichTextEditorProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function HtmlRichTextEditor({
  value,
  onChange,
  placeholder,
  required,
}: HtmlRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "admin-rich-text-editor__content",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getHTML());
    },
  });

  React.useEffect(() => {
    if (!editor) {
      return;
    }

    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const addLink = React.useCallback(() => {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }, [editor]);

  const addImage = React.useCallback(() => {
    if (!editor) {
      return;
    }

    const url = window.prompt("Enter image URL", "https://");
    if (!url || !url.trim()) {
      return;
    }

    editor.chain().focus().setImage({ src: url.trim() }).run();
  }, [editor]);

  if (!editor) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={6}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div className="admin-rich-text-editor">
      <input
        value={value}
        onChange={() => {
          // Controlled by the Tiptap editor update lifecycle.
        }}
        readOnly
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
        }}
      />
      <div className="admin-rich-text-editor__toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          Bullet list
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
        >
          Numbered list
        </button>
        <button
          type="button"
          onClick={addLink}
          className={editor.isActive("link") ? "is-active" : ""}
        >
          Link
        </button>
        <button type="button" onClick={addImage}>
          Image
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
