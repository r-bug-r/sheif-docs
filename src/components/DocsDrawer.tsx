"use client";

import { Copy, Download, FilePlus2, Moon, Search, Sun, Trash2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DocumentItem } from "./types";

interface DocsDrawerProps {
  open: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDoc: (doc: DocumentItem) => void;
  onCreateDoc: () => void;
  onTriggerUpload: () => void;
  onDeleteDoc: (docId: string) => void;
  onDuplicateDoc: (doc: DocumentItem) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onExportMarkdown?: () => void;
}

function formatRelative(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function DocsDrawer({
  open,
  onClose,
  documents,
  activeDocId,
  onSelectDoc,
  onCreateDoc,
  onTriggerUpload,
  onDeleteDoc,
  onDuplicateDoc,
  darkMode,
  onToggleDarkMode,
  onExportMarkdown,
}: DocsDrawerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.owner_name.toLowerCase().includes(q)
    );
  }, [documents, query]);

  const ownedDocs = filtered.filter((d) => d.permission === "owner");
  const sharedDocs = filtered.filter((d) => d.permission !== "owner");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Documents Drawer"
        className={`fixed top-3 left-3 bottom-3 z-40 w-[290px] max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-[320px] pointer-events-none"
        }`}
      >
        <div className="px-3.5 pt-3.5 pb-2.5 flex items-center justify-between border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-white text-xs font-bold">
              A
            </span>
            <span>Documents</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close documents drawer"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3 space-y-2.5 border-b border-[var(--border-hairline)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateDoc();
                onClose();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.97] transition"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>New Doc</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onTriggerUpload();
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)] active:scale-[0.97] transition"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
            </button>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles..."
              aria-label="Search documents"
              className="w-full rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-desk)] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
          <section>
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Owned by me</span>
              <span>{ownedDocs.length}</span>
            </div>
            {ownedDocs.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-[var(--text-muted)]">No owned docs</p>
            ) : (
              <div className="space-y-1">
                {ownedDocs.map((doc) => {
                  const isActive = doc.id === activeDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition ${
                        isActive
                          ? "bg-[var(--accent-soft)] text-[var(--text-ink)]"
                          : "hover:bg-[var(--bg-subtle)]"
                      }`}
                      onClick={() => {
                        onSelectDoc(doc);
                        onClose();
                      }}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`text-xs truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {formatRelative(doc.updated_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateDoc(doc);
                          }}
                          title="Duplicate"
                          aria-label={`Duplicate ${doc.title}`}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--text-ink)]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDoc(doc.id);
                          }}
                          title="Delete"
                          aria-label={`Delete ${doc.title}`}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Shared with me</span>
              <span>{sharedDocs.length}</span>
            </div>
            {sharedDocs.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-[var(--text-muted)]">No shared docs</p>
            ) : (
              <div className="space-y-1">
                {sharedDocs.map((doc) => {
                  const isActive = doc.id === activeDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition ${
                        isActive
                          ? "bg-[var(--accent-soft)] text-[var(--text-ink)]"
                          : "hover:bg-[var(--bg-subtle)]"
                      }`}
                      onClick={() => {
                        onSelectDoc(doc);
                        onClose();
                      }}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`text-xs truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-[var(--text-muted)] truncate">
                            {doc.owner_name}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              doc.permission === "edit"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {doc.permission === "edit" ? "Can edit" : "View only"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateDoc(doc);
                        }}
                        title="Make a copy"
                        aria-label={`Make a copy of ${doc.title}`}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--text-ink)]"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="px-3.5 py-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
          <span>.txt, .md, .docx (max 2 MB)</span>
          <div className="flex items-center gap-1">
            {onExportMarkdown && (
              <button
                type="button"
                onClick={() => {
                  onExportMarkdown();
                  onClose();
                }}
                title="Export Markdown"
                aria-label="Export Markdown"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-ink)]"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title="Toggle theme"
                aria-label="Toggle theme"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-ink)]"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
