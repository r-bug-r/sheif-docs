# Architecture Note — Ajaia Docs

## 1. What We Prioritized & Why
Within the 4–6 hour constraint, we prioritized **depth across the 4 core workflows** over breadth:

1. **Zero-Clutter Writing Ergonomics (Excalidraw-Inspired Canvas):**
   - Instead of a 40-button Google Docs ribbon and permanent sidebar, the workspace uses a transparent floating header, a collapsible `Documents` drawer (`☰` or `Ctrl/Cmd + \`), and a centered `760px` paper sheet.
   - Formatting is discoverable through three paths simultaneously: the floating center pill, a text-selection bubble menu, and `/` slash commands + Markdown shortcuts. On mobile (`< 768px`), the formatting pill docks to a thumb-friendly bottom bar.
2. **Real Server-Enforced Sharing & Clear Ownership:**
   - Every document read/write/delete/share goes through Next.js Route Handlers (`/api/documents/*`) that verify the HMAC-signed `ajaia_session` cookie and enforce `owner` / `edit` / `view` permissions in SQL before mutating data.
   - The UI mirrors this clearly: `Owned by me` vs `Shared with me` with owner attribution, `Can edit` / `View only` pills, and an unmistakable read-only lock + `Make a Copy` action for `View only` users.
3. **Production-Ready Dual-Mode Persistence:**
   - `src/lib/db.ts` uses `pg` against a dedicated `ajaia_docs` schema on Supabase Postgres when `DATABASE_URL` is set (for persistent serverless Vercel hosting), and falls back cleanly to `@libsql/client` local SQLite (`file:./data/ajaia-docs.db`) when `DATABASE_URL` is absent so reviewers can run the repo locally with zero configuration.
4. **Safe, Structured File Import:**
   - `.txt`, `.md` (`marked`), and `.docx` (`mammoth`) are validated for extension and `2 MB` size on both client and server, sanitized (`stripDangerousHtml` removes `<script>`, `<iframe>`, `<object>`, `on*`, and `javascript:` URLs), and shown in an **Import Preview Modal** before creating or appending to a document.

## 2. Intentional Scope Cuts
- **No real-time CRDT/WebSocket multi-cursor sync:** Replaced with `750ms` debounced autosave, `Cmd/Ctrl + S` manual flush, and dirty-state `beforeunload` protection.
- **No inline comment threads or full revision history:** Kept the data model and UI focused on clean drafting and access control.
- **No OAuth/password flows:** Replaced with a 1-click seeded account switcher + signed `httpOnly` cookie so reviewers can test multi-user sharing in seconds.

## 3. What I Would Build Next (With Another 2–4 Hours)
1. **Real-Time Presence & Optimistic Conflict Detection:** Add `updated_at` version checks (`409 Conflict` merge prompt) or Supabase Realtime channel presence indicators.
2. **Document Version Snapshots:** Store periodic snapshots in `ajaia_docs.document_versions` with a lightweight diff/restore drawer.
3. **Inline Comments & PDF Export:** Anchored margin comments via Tiptap marks and print-styled PDF export.
