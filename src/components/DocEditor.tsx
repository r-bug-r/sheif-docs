"use client";

import { BubbleMenu, EditorContent, useEditor, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DocEditorProps {
  docId: string;
  content: string;
  editable: boolean;
  onChange: (html: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onStatsChange?: (stats: { words: number; chars: number }) => void;
}

const SLASH_COMMANDS = [
  {
    id: "h1",
    label: "Heading 1",
    shortcut: "# ",
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    shortcut: "## ",
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    shortcut: "### ",
    run: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet",
    label: "Bulleted list",
    shortcut: "- ",
    run: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    label: "Numbered list",
    shortcut: "1. ",
    run: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

function computeStats(editor: Editor): { words: number; chars: number } {
  const text = editor.getText().trim();
  const words = text ? text.split(/\s+/).length : 0;
  return { words, chars: text.length };
}

export function ToolbarButtons({
  editor,
  compact = false,
}: {
  editor: Editor;
  compact?: boolean;
}) {
  const btn = (active: boolean) =>
    `inline-flex items-center justify-center rounded-lg transition active:scale-[0.95] ${
      compact ? "h-8 w-8" : "h-7 w-7"
    } ${
      active
        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
        : "text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
    }`;

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btn(editor.isActive("heading", { level: 1 }))}
        title="Heading 1"
        aria-label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btn(editor.isActive("heading", { level: 2 }))}
        title="Heading 2"
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
        title="Heading 3"
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>

      <span className="mx-1 h-4 w-px bg-[var(--border-hairline)]" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btn(editor.isActive("underline"))}
        title="Underline (Ctrl+U)"
        aria-label="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </button>

      <span className="mx-1 h-4 w-px bg-[var(--border-hairline)]" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
        title="Bulleted list"
        aria-label="Bulleted list"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
        title="Numbered list"
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </button>

      {compact && (
        <>
          <span className="mx-1 h-4 w-px bg-[var(--border-hairline)]" />
          <button
            type="button"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
            className={`${btn(false)} disabled:opacity-35`}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
            className={`${btn(false)} disabled:opacity-35`}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function DocEditor({
  docId,
  content,
  editable,
  onChange,
  onEditorReady,
  onStatsChange,
}: DocEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Start writing, or type / for headings and lists...",
      }),
    ],
    content,
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
      onStatsChange?.(computeStats(ed));

      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(Math.max(0, from - 2), from, "\n");
      setSlashOpen(editable && textBefore.endsWith("/"));
    },
  });

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    if (editor) {
      onStatsChange?.(computeStats(editor));
    }
  }, [editor, onEditorReady, onStatsChange]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
      onStatsChange?.(computeStats(editor));
    }
    setSlashOpen(false);
    // Only reset editor content when switching documents or external import appends
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, content]);

  if (!editor) {
    return (
      <div className="min-h-[55vh] animate-pulse rounded-xl bg-[var(--bg-subtle)]/40" />
    );
  }

  const runSlashCommand = (runFn: (ed: Editor) => void) => {
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: Math.max(0, from - 1), to: from }).run();
    runFn(editor);
    setSlashOpen(false);
  };

  return (
    <div className="relative">
      {editable && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 120 }}
          className="flex items-center gap-0.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-1.5 py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg ${editor.isActive("bold") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--bg-subtle)]"}`}
            aria-label="Bubble bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg ${editor.isActive("italic") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--bg-subtle)]"}`}
            aria-label="Bubble italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg ${editor.isActive("underline") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--bg-subtle)]"}`}
            aria-label="Bubble underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-lg ${editor.isActive("heading", { level: 2 }) ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "hover:bg-[var(--bg-subtle)]"}`}
            aria-label="Bubble heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
        </BubbleMenu>
      )}

      {slashOpen && editable && (
        <div
          role="menu"
          aria-label="Slash formatting commands"
          className="mb-2 w-56 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-1.5 shadow-xl"
        >
          {SLASH_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => runSlashCommand(cmd.run)}
              className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-[var(--bg-subtle)] transition"
            >
              <span className="font-medium">{cmd.label}</span>
              <code className="text-[10px] text-[var(--text-muted)]">{cmd.shortcut}</code>
            </button>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
