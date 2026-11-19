"use client";

import { UserPlus, X } from "lucide-react";
import { useState } from "react";
import type { DocumentItem, ShareItem, UserItem } from "./types";

interface SharePopoverProps {
  open: boolean;
  onClose: () => void;
  doc: DocumentItem;
  shares: ShareItem[];
  allUsers: UserItem[];
  currentUser: UserItem;
  onGrantShare: (email: string, permission: "view" | "edit") => Promise<void>;
  onRevokeShare: (userId: string) => Promise<void>;
}

export function SharePopover({
  open,
  onClose,
  doc,
  shares,
  allUsers,
  currentUser,
  onGrantShare,
  onRevokeShare,
}: SharePopoverProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"edit" | "view">("edit");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const isOwner = doc.permission === "owner";
  const sharedIds = new Set(shares.map((s) => s.user_id));
  const quickTeammates = allUsers.filter(
    (u) => u.id !== doc.owner_id && !sharedIds.has(u.id)
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await onGrantShare(email.trim(), permission);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/15" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Share document"
        className="fixed z-50 top-16 right-4 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] shadow-2xl p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold truncate pr-2">Share &ldquo;{doc.title}&rdquo;</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isOwner ? (
          <>
            {quickTeammates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {quickTeammates.map((teammate) => (
                  <button
                    key={teammate.id}
                    type="button"
                    disabled={busy}
                    onClick={() => onGrantShare(teammate.email, "edit")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--bg-subtle)] transition"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: teammate.avatar_color }}
                    />
                    <span>+ {teammate.name}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleInvite} className="flex gap-1.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@ajaia.dev"
                aria-label="Collaborator email"
                className="flex-1 min-w-0 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-3 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "edit" | "view")}
                aria-label="Permission level"
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-2 py-1.5 text-xs outline-none"
              >
                <option value="edit">Can edit</option>
                <option value="view">View only</option>
              </select>
              <button
                type="submit"
                disabled={busy}
                aria-label="Grant access"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-2.5 py-1.5 text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </form>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        ) : (
          <div className="rounded-xl bg-[var(--bg-desk)] px-3 py-2 text-xs text-[var(--text-muted)]">
            Only the owner ({doc.owner_name}) can change sharing settings.
          </div>
        )}

        <div className="space-y-2 pt-1 border-t border-[var(--border-hairline)]">
          <div className="flex items-center justify-between text-xs py-1">
            <div className="min-w-0">
              <div className="font-medium truncate">
                {doc.owner_name} {doc.owner_id === currentUser.id ? "(You)" : ""}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">{doc.owner_email}</div>
            </div>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Owner</span>
          </div>

          {shares.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-xs py-1 gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {s.user_name} {s.user_id === currentUser.id ? "(You)" : ""}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{s.user_email}</div>
              </div>
              {isOwner ? (
                <select
                  value={s.permission}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "remove") {
                      void onRevokeShare(s.user_id);
                    } else {
                      void onGrantShare(s.user_email, val as "view" | "edit");
                    }
                  }}
                  aria-label={`Permission for ${s.user_name}`}
                  className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-2 py-1 text-[11px]"
                >
                  <option value="edit">Can edit</option>
                  <option value="view">View only</option>
                  <option value="remove">Remove</option>
                </select>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {s.permission === "edit" ? "Can edit" : "View only"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
