# AI-Native Workflow Log — Ajaia Docs

> Live engineering & decision log maintained throughout the 4-hour assignment build.

## 1. AI Tools Used
- **AI Coding Assistant**: Architecture planning, Next.js/TypeScript/Tiptap implementation, automated test authoring, and Vercel deployment.
- **AI UX Design Prompting**: Initial UX storyboard, Google Docs flaw-to-upgrade mapping, and mobile layout spec.
- **Playwright**: Live browser verification across desktop (`1440×900`) and mobile (`375×812`) viewports on both local and production Vercel builds.

---

## 2. Where AI Materially Sped Up Work
1. **End-to-End Scaffolding & Dual-Mode DB Layer (`src/lib/db.ts`):** Generated a unified `DbAdapter` supporting both Supabase Postgres (`pg`, isolated `ajaia_docs` schema) for Vercel production and zero-config local SQLite (`@libsql/client`) for reviewers.
2. **Tiptap Editor + Multi-Path Formatting (`src/components/DocEditor.tsx`):** Rapidly wired Tiptap `StarterKit`, `Underline`, `BubbleMenu`, `/` slash commands, Markdown input shortcuts, and mobile bottom-docked formatting bar.
3. **File Import Pipeline (`src/lib/import-parser.ts`):** Integrated `marked` (`.md`), `mammoth` (`.docx`), and `.txt` paragraph parsing with `ImportModal` live preview.
4. **Automated Test Suite (`tests/api-and-access.test.ts`):** Built a 4-test `node --test` suite covering CRUD persistence, upload validation/XSS sanitization, signed cookies, and owner/edit/view boundaries.

---

## 3. What AI Output We Changed or Rejected
1. **Rejected `localStorage`-only persistence:** The initial AI UX draft proposed `localStorage` for quick persistence. Rejected because Ajaia evaluates full-stack execution and server-enforced sharing/access control—replaced with Supabase Postgres (`ajaia_docs` schema) + local SQLite fallback and backend `403` enforcement.
2. **Rejected Notion-style permanent sidebar + ribbon:** Initial layout draft used a permanent left sidebar and traditional top bar. Pivoted to an **Excalidraw-inspired transparent floating header + collapsible `Documents` drawer** and **Bendy-inspired minimal landing page** (removing generic 4-card SaaS boxes and eyebrow pill spam).
3. **Caught & fixed unhandled API failure crash in `WorkspaceApp.tsx`:** During live Playwright QA, a transient local DNS failure (`ENOTFOUND`) caused `/api/documents` to return `500`, which crashed `docsData.documents.find(...)`. Added explicit `!sessionRes.ok || !docsRes.ok` guards and user-facing error banner.
4. **Caught & fixed cross-user queued save race:** When switching from Alice to Bob while a debounced `PATCH` was pending, the `PATCH` fired under Bob's new session and triggered a `403` toast. Fixed `switchUser` to flush and clear `pendingPatchRef` + `toastError` before switching.
5. **Added mobile Dark Mode & Export parity:** Initial draft placed Dark Mode and Export only in the desktop bottom-right micro-island (`hidden md:flex`). Added both controls to `DocsDrawer` so mobile (`375px`) users have full parity.

---

## 4. Verification Performed
- **Typecheck:** `npx tsc --noEmit` -> exit `0`.
- **Automated Tests:** `npm test` -> **4/4 passed** (`pass 4, fail 0`).
- **Production Build:** `npm run build` -> exit `0` (`/` First Load JS `106 kB`, `/docs` `222 kB`).
- **Live Vercel + Supabase Playwright QA (`https://ajaia-docs-eight-ivory.vercel.app`):**
  - Verified doc creation, inline rename, Supabase persistence across reload, `View only` sharing from Alice to Bob, locked read-only banner + `Make a Copy`, Dark Mode, and zero horizontal overflow at `1440×900` and `375×812`.
