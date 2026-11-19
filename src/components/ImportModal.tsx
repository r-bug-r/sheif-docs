"use client";

import { FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ImportModalProps {
  open: boolean;
  filename: string;
  initialTitle: string;
  previewHtml: string;
  canAppend: boolean;
  onClose: () => void;
  onCreateNew: (title: string, content: string) => Promise<void>;
  onAppendCurrent: (content: string) => Promise<void>;
}

export function ImportModal({
  open,
  filename,
  initialTitle,
  previewHtml,
  canAppend,
  onClose,
  onCreateNew,
  onAppendCurrent,
}: ImportModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-label="Import file preview"
        className="w-full max-w-lg rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-[var(--accent)]" />
            <span>Import {filename}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import preview"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-3 py-2 text-sm font-medium outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Parsed Preview
            </div>
            <div
              className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-3.5 text-sm ProseMirror !min-h-0"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-hairline)] px-3.5 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)]"
          >
            Cancel
          </button>
          {canAppend && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onAppendCurrent(previewHtml);
                  onClose();
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl border border-[var(--border-hairline)] px-3.5 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              Append to Current
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onCreateNew(title.trim() || initialTitle, previewHtml);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
}
