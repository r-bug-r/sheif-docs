"use client";

import type { Editor } from "@tiptap/react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FilePlus2,
  HelpCircle,
  Lock,
  Menu,
  Moon,
  Redo2,
  Share2,
  Sun,
  Undo2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DocEditor, ToolbarButtons } from "./DocEditor";
import { DocsDrawer } from "./DocsDrawer";
import { ImportModal } from "./ImportModal";
import { SharePopover } from "./SharePopover";
import type { DocumentItem, ShareItem, UserItem } from "./types";

function clientHtmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<li[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, "- $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function WorkspaceApp({ initialDemo }: { initialDemo?: string }) {
  const [user, setUser] = useState<UserItem | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [toastError, setToastError] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [editor, setEditor] = useState<Editor | null>(null);

  const [importPreview, setImportPreview] = useState<{
    open: boolean;
    filename: string;
    title: string;
    html: string;
  }>({ open: false, filename: "", title: "", html: "" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<{ docId: string; title?: string; content?: string } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const loadWorkspace = useCallback(async (preferDocId?: string) => {
    try {
      const [sessionRes, docsRes] = await Promise.all([
        fetch("/api/auth/session", { cache: "no-store" }),
        fetch("/api/documents", { cache: "no-store" }),
      ]);
      const sessionData = (await sessionRes.json().catch(() => ({}))) as {
        user?: UserItem;
        users?: UserItem[];
        error?: string;
      };
      const docsData = (await docsRes.json().catch(() => ({}))) as {
        documents?: DocumentItem[];
        error?: string;
      };

      if (!sessionRes.ok || !docsRes.ok || !sessionData.user || !Array.isArray(docsData.documents)) {
        setToastError(docsData.error || sessionData.error || "Failed to load workspace.");
        return;
      }

      setUser(sessionData.user);
      setUsers(sessionData.users || []);
      setDocuments(docsData.documents);

      const target =
        (preferDocId && docsData.documents.find((d) => d.id === preferDocId)) ||
        docsData.documents[0] ||
        null;

      setActiveDoc(target);
      if (target) {
        const detailRes = await fetch(`/api/documents/${target.id}`, { cache: "no-store" });
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as { document: DocumentItem; shares: ShareItem[] };
          setActiveDoc(detail.document);
          setShares(detail.shares);
        }
      } else {
        setShares([]);
      }
    } catch (err) {
      setToastError(err instanceof Error ? err.message : "Failed to load workspace.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (initialDemo === "bob") {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "usr_bob" }),
        });
      }
      await loadWorkspace();
    })();
  }, [initialDemo, loadWorkspace]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingPatchRef.current;
    if (!pending) return;

    setSaveState("saving");
    try {
      const res = await fetch(`/api/documents/${pending.docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pending.title, content: pending.content }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Save failed");
      }
      const data = (await res.json()) as { document: DocumentItem };
      pendingPatchRef.current = null;
      setSaveState("saved");
      setDocuments((prev) =>
        prev.map((d) => (d.id === data.document.id ? data.document : d))
      );
    } catch (err) {
      setSaveState("error");
      setToastError(err instanceof Error ? err.message : "Save failed");
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setShareOpen(false);
        setUserMenuOpen(false);
        setExportOpen(false);
        setHelpOpen(false);
        setImportPreview((p) => (p.open ? { ...p, open: false } : p));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flushSave();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setDrawerOpen((o) => !o);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingPatchRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushSave]);

  const queueSave = (docId: string, patch: { title?: string; content?: string }) => {
    pendingPatchRef.current = {
      docId,
      title: patch.title ?? pendingPatchRef.current?.title,
      content: patch.content ?? pendingPatchRef.current?.content,
    };
    setSaveState("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSave();
    }, 750);
  };

  const selectDoc = async (doc: DocumentItem) => {
    await flushSave();
    setActiveDoc(doc);
    setSaveState("saved");
    const res = await fetch(`/api/documents/${doc.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { document: DocumentItem; shares: ShareItem[] };
      setActiveDoc(data.document);
      setShares(data.shares);
    }
  };

  const createDoc = async (title = "Untitled Document", content = "<p></p>") => {
    await flushSave();
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      setToastError("Could not create document.");
      return;
    }
    const data = (await res.json()) as { document: DocumentItem };
    setDocuments((prev) => [data.document, ...prev]);
    setActiveDoc(data.document);
    setShares([]);
    setSaveState("saved");
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 40);
  };

  const deleteDoc = async (docId: string) => {
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setToastError(err.error || "Could not delete document.");
      return;
    }
    const remaining = documents.filter((d) => d.id !== docId);
    setDocuments(remaining);
    if (activeDoc?.id === docId) {
      setActiveDoc(remaining[0] || null);
      if (remaining[0]) void selectDoc(remaining[0]);
    }
  };

  const switchUser = async (targetUserId: string) => {
    await flushSave();
    pendingPatchRef.current = null;
    setToastError(null);
    setUserMenuOpen(false);
    setShareOpen(false);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });
    if (res.ok) {
      await loadWorkspace(activeDoc?.id);
    }
  };

  const handleFileUpload = async (file: File) => {
    setToastError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("preview", "true");

    const res = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      filename?: string;
      preview?: { title: string; content: string };
    };
    if (!res.ok || !data.preview) {
      setToastError(data.error || "Unsupported or invalid file.");
      return;
    }
    setImportPreview({
      open: true,
      filename: data.filename || file.name,
      title: data.preview.title,
      html: data.preview.content,
    });
  };

  const downloadExport = (format: "md" | "html") => {
    if (!activeDoc) return;
    const body =
      format === "md"
        ? `# ${activeDoc.title}\n\n${clientHtmlToMarkdown(activeDoc.content)}`
        : `<!doctype html><html><head><meta charset="utf-8"><title>${activeDoc.title}</title></head><body>${activeDoc.content}</body></html>`;
    const blob = new Blob([body], {
      type: format === "md" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "document"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const canEdit = activeDoc ? activeDoc.permission !== "view" : false;

  return (
    <div
      className="min-h-screen relative flex flex-col bg-[var(--bg-desk)] text-[var(--text-ink)]"
      onDragOver={(e) => {
        e.preventDefault();
        setDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDraggingFile(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFileUpload(file);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileUpload(file);
          e.target.value = "";
        }}
      />

      {draggingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--accent)]/10 backdrop-blur-sm border-2 border-dashed border-[var(--accent)] m-3 rounded-3xl pointer-events-none">
          <div className="rounded-2xl bg-[var(--bg-paper)] px-6 py-4 shadow-xl text-sm font-semibold">
            Drop .txt, .md, or .docx to import
          </div>
        </div>
      )}

      {/* Full-width Transparent Floating Header (Excalidraw-inspired) */}
      <header className="fixed top-0 left-0 right-0 z-20 px-3 sm:px-4 pt-3 pointer-events-none">
        <div className="w-full flex items-center justify-between gap-2">
          {/* Left Island: Menu + Title + Save Pill */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-island)] backdrop-blur-md px-2 py-1.5 shadow-sm max-w-[42vw] sm:max-w-[280px]">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open documents drawer"
              className="p-1.5 rounded-xl hover:bg-[var(--bg-subtle)] active:scale-[0.96] transition shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium truncate">
              {activeDoc ? activeDoc.title : "Ajaia Docs"}
            </span>
            {activeDoc && canEdit && (
              <button
                type="button"
                onClick={() => void flushSave()}
                role="status"
                aria-label="Save status"
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--bg-desk)] shrink-0"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    saveState === "saved"
                      ? "bg-emerald-600"
                      : saveState === "error"
                      ? "bg-red-600"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span className="hidden sm:inline">
                  {saveState === "saved"
                    ? "Saved"
                    : saveState === "saving"
                    ? "Saving..."
                    : saveState === "error"
                    ? "Retry"
                    : "Unsaved"}
                </span>
              </button>
            )}
          </div>

          {/* Center Island: Scoped Formatting Toolbar (Desktop) */}
          {activeDoc && (
            <div className="pointer-events-auto hidden md:flex items-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-island)] backdrop-blur-md px-2 py-1 shadow-sm">
              {canEdit && editor ? (
                <ToolbarButtons editor={editor} />
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <Lock className="h-3.5 w-3.5" />
                  <span>View only · Owned by {activeDoc.owner_name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void createDoc(`${activeDoc.title} (Copy)`, activeDoc.content)
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-ink)] hover:opacity-80"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Make a Copy</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Right Island: Upload + User Switcher + Share */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-island)] backdrop-blur-md px-2 py-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload .txt, .md, or .docx"
              aria-label="Upload file"
              className="p-1.5 rounded-xl hover:bg-[var(--bg-subtle)] active:scale-[0.96] transition"
            >
              <Upload className="h-4 w-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-label="Switch user account"
                className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium hover:bg-[var(--bg-subtle)] transition"
              >
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: user?.avatar_color || "#E8501A" }}
                >
                  {user?.name?.charAt(0) || "A"}
                </span>
                <span className="hidden sm:inline max-w-[90px] truncate">{user?.name}</span>
                <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  aria-label="Seeded user switcher"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-1.5 shadow-xl"
                >
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Switch Account
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => void switchUser(u.id)}
                      className="w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs hover:bg-[var(--bg-subtle)] transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-5 w-5 rounded-full text-[10px] font-bold text-white inline-flex items-center justify-center shrink-0"
                          style={{ backgroundColor: u.avatar_color }}
                        >
                          {u.name.charAt(0)}
                        </span>
                        <div className="text-left min-w-0">
                          <div className="font-medium truncate">{u.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</div>
                        </div>
                      </div>
                      {u.id === user?.id && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeDoc && (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] active:scale-[0.97] transition"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {toastError && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 shadow-lg"
        >
          <span>{toastError}</span>
          <button
            type="button"
            onClick={() => setToastError(null)}
            className="underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Writing Canvas */}
      <main className="flex-1 pt-20 pb-24 px-3 sm:px-6 flex justify-center">
        {activeDoc ? (
          <div className="w-full max-w-[760px] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] shadow-xs px-5 sm:px-12 py-8 sm:py-11">
            {!canEdit && (
              <div
                aria-live="polite"
                className="mb-5 flex md:hidden items-center justify-between gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300"
              >
                <span>View only · {activeDoc.owner_name}</span>
                <button
                  type="button"
                  onClick={() =>
                    void createDoc(`${activeDoc.title} (Copy)`, activeDoc.content)
                  }
                  className="underline font-semibold"
                >
                  Make a Copy
                </button>
              </div>
            )}

            <input
              ref={titleInputRef}
              type="text"
              value={activeDoc.title}
              readOnly={!canEdit}
              placeholder="Untitled Document"
              aria-label="Document title"
              onFocus={(e) => {
                if (canEdit && e.target.value === "Untitled Document") {
                  e.target.select();
                }
              }}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setActiveDoc((prev) => (prev ? { ...prev, title: nextTitle } : prev));
                queueSave(activeDoc.id, { title: nextTitle });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor?.commands.focus("start");
                }
              }}
              className="w-full bg-transparent text-2xl sm:text-3xl font-bold tracking-tight outline-none mb-5 border-b border-transparent focus:border-[var(--border-hairline)] pb-1"
            />

            <DocEditor
              docId={activeDoc.id}
              content={activeDoc.content}
              editable={canEdit}
              onEditorReady={setEditor}
              onStatsChange={setStats}
              onChange={(html) => {
                setActiveDoc((prev) => (prev ? { ...prev, content: html } : prev));
                queueSave(activeDoc.id, { content: html });
              }}
            />
          </div>
        ) : (
          <div className="self-center text-center space-y-4 max-w-sm rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-8">
            <h1 className="text-lg font-semibold">No documents yet</h1>
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => void createDoc()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                <FilePlus2 className="h-4 w-4" />
                <span>New Document</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Micro-Islands (Desktop) */}
      <div className="fixed bottom-3 left-4 right-4 z-20 hidden md:flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-island)] backdrop-blur-md px-2 py-1 shadow-sm text-xs">
          {editor && canEdit && (
            <>
              <button
                type="button"
                disabled={!editor.can().undo()}
                onClick={() => editor.chain().focus().undo().run()}
                aria-label="Undo"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] disabled:opacity-35"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!editor.can().redo()}
                onClick={() => editor.chain().focus().redo().run()}
                aria-label="Redo"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] disabled:opacity-35"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <span className="mx-1 h-3.5 w-px bg-[var(--border-hairline)]" />
            </>
          )}
          <span className="px-1.5 text-[11px] text-[var(--text-muted)] tabular-nums">
            {stats.words} words
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-island)] backdrop-blur-md px-2 py-1 shadow-sm text-xs relative">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)]"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {activeDoc && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                aria-label="Export document"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium hover:bg-[var(--bg-subtle)]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
              {exportOpen && (
                <div className="absolute bottom-9 right-0 w-36 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => downloadExport("md")}
                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs hover:bg-[var(--bg-subtle)]"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadExport("html")}
                    className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs hover:bg-[var(--bg-subtle)]"
                  >
                    HTML (.html)
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-label="Keyboard shortcuts"
              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)]"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
            {helpOpen && (
              <div className="absolute bottom-9 right-0 w-56 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 shadow-xl text-xs space-y-1.5">
                <div className="font-semibold mb-1">Shortcuts</div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Save</span>
                  <code>Ctrl/Cmd + S</code>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Docs Drawer</span>
                  <code>Ctrl/Cmd + \</code>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Block Menu</span>
                  <code>/</code>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Heading / Bold</span>
                  <code># / **text**</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom-Docked Formatting Bar */}
      {activeDoc && canEdit && editor && (
        <div className="fixed bottom-0 left-0 right-0 z-20 flex md:hidden items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 backdrop-blur-md px-2 py-1.5 overflow-x-auto">
          <ToolbarButtons editor={editor} compact />
        </div>
      )}

      <DocsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        documents={documents}
        activeDocId={activeDoc?.id ?? null}
        onSelectDoc={(doc) => void selectDoc(doc)}
        onCreateDoc={() => void createDoc()}
        onTriggerUpload={() => fileInputRef.current?.click()}
        onDeleteDoc={(id) => void deleteDoc(id)}
        onDuplicateDoc={(doc) => void createDoc(`${doc.title} (Copy)`, doc.content)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onExportMarkdown={activeDoc ? () => downloadExport("md") : undefined}
      />

      {activeDoc && user && (
        <SharePopover
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          doc={activeDoc}
          shares={shares}
          allUsers={users}
          currentUser={user}
          onGrantShare={async (email, permission) => {
            const res = await fetch(`/api/documents/${activeDoc.id}/shares`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, permission }),
            });
            const data = (await res.json()) as { shares?: ShareItem[]; error?: string };
            if (!res.ok) throw new Error(data.error || "Failed to share");
            setShares(data.shares || []);
          }}
          onRevokeShare={async (targetUserId) => {
            const res = await fetch(`/api/documents/${activeDoc.id}/shares`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: targetUserId }),
            });
            const data = (await res.json()) as { shares?: ShareItem[] };
            if (res.ok) setShares(data.shares || []);
          }}
        />
      )}

      <ImportModal
        open={importPreview.open}
        filename={importPreview.filename}
        initialTitle={importPreview.title}
        previewHtml={importPreview.html}
        canAppend={Boolean(activeDoc && canEdit)}
        onClose={() => setImportPreview((p) => ({ ...p, open: false }))}
        onCreateNew={async (title, content) => {
          await createDoc(title, content);
        }}
        onAppendCurrent={async (content) => {
          if (!activeDoc) return;
          const merged = `${activeDoc.content}${content}`;
          setActiveDoc((prev) => (prev ? { ...prev, content: merged } : prev));
          queueSave(activeDoc.id, { content: merged });
          await flushSave();
        }}
      />
    </div>
  );
}
