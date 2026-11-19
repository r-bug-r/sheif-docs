import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  permission: "owner" | "edit" | "view";
  created_at: string;
  updated_at: string;
}

export interface ShareRecord {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  avatar_color: string;
  permission: "view" | "edit";
  created_at: string;
}

export const SEEDED_USERS: UserRecord[] = [
  { id: "usr_alice", name: "Alice Chen", email: "alice@ajaia.dev", avatar_color: "#5B57D6" },
  { id: "usr_bob", name: "Bob Reyes", email: "bob@ajaia.dev", avatar_color: "#0EA5E9" },
  { id: "usr_carol", name: "Carol Santos", email: "carol@ajaia.dev", avatar_color: "#10B981" },
];

type QueryRow = Record<string, unknown>;

interface DbAdapter {
  mode: "postgres" | "sqlite";
  query(sql: string, args?: unknown[]): Promise<QueryRow[]>;
  exec(sql: string): Promise<void>;
}

let adapterInstance: DbAdapter | null = null;
let initPromise: Promise<void> | null = null;

function toPgPlaceholders(sql: string): string {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function getAdapter(): DbAdapter {
  if (adapterInstance) return adapterInstance;

  const pgUrl = process.env.DATABASE_URL?.trim();
  if (pgUrl) {
    const pool = new Pool({
      connectionString: pgUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
    adapterInstance = {
      mode: "postgres",
      async query(sql: string, args: unknown[] = []) {
        const res = await pool.query(toPgPlaceholders(sql), args);
        return res.rows as QueryRow[];
      },
      async exec(sql: string) {
        await pool.query(sql);
      },
    };
    return adapterInstance;
  }

  const dbPath =
    process.env.AJAIA_DB_PATH?.trim() ||
    (process.env.VERCEL
      ? "/tmp/ajaia-docs.db"
      : path.join(process.cwd(), "data", "ajaia-docs.db"));

  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const sqlite: Client = createClient({ url: `file:${dbPath}` });
  adapterInstance = {
    mode: "sqlite",
    async query(sql: string, args: unknown[] = []) {
      const res = await sqlite.execute({ sql, args: args as (string | number | null)[] });
      return res.rows as unknown as QueryRow[];
    },
    async exec(sql: string) {
      await sqlite.executeMultiple(sql);
    },
  };
  return adapterInstance;
}

export function resetDbForTests(): void {
  adapterInstance = null;
  initPromise = null;
}

function tbl(adapter: DbAdapter, name: string): string {
  return adapter.mode === "postgres" ? `ajaia_docs.${name}` : name;
}

export async function ensureDb(): Promise<DbAdapter> {
  const db = getAdapter();
  if (!initPromise) {
    initPromise = (async () => {
      if (db.mode === "postgres") {
        await db.exec(`
          CREATE SCHEMA IF NOT EXISTS ajaia_docs;

          CREATE TABLE IF NOT EXISTS ajaia_docs.users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            avatar_color TEXT NOT NULL,
            created_seq BIGSERIAL
          );

          CREATE TABLE IF NOT EXISTS ajaia_docs.documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            owner_id TEXT NOT NULL REFERENCES ajaia_docs.users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS ajaia_docs.document_shares (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES ajaia_docs.documents(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES ajaia_docs.users(id) ON DELETE CASCADE,
            permission TEXT NOT NULL CHECK(permission IN ('view', 'edit')),
            created_at TEXT NOT NULL,
            UNIQUE(document_id, user_id)
          );
        `);
      } else {
        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            avatar_color TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS document_shares (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            permission TEXT NOT NULL CHECK(permission IN ('view', 'edit')),
            created_at TEXT NOT NULL,
            UNIQUE(document_id, user_id)
          );
        `);
      }

      const existingUsers = await db.query(`SELECT COUNT(*) as cnt FROM ${tbl(db, "users")}`);
      const userCount = Number(existingUsers[0]?.cnt ?? 0);

      if (userCount === 0) {
        for (const u of SEEDED_USERS) {
          await db.query(
            `INSERT INTO ${tbl(db, "users")} (id, name, email, avatar_color) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
            [u.id, u.name, u.email, u.avatar_color]
          );
        }

        const now = new Date().toISOString();
        const earlier = new Date(Date.now() - 1000 * 60 * 18).toISOString();

        await db.query(
          `INSERT INTO ${tbl(db, "documents")} (id, title, content, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            "doc_welcome",
            "Q4 Product Launch Brief",
            `<h1>Q4 Product Launch Brief</h1><p>A calm, distraction-free workspace built for fast team alignment.</p><h2>Core Priorities</h2><ul><li><p><strong>Ship the 80/20 slice:</strong> Clean rich-text editing, instant file import, and clear sharing permissions.</p></li><li><p><strong>Zero friction:</strong> Type <code># </code> for headings, <code>**bold**</code> for emphasis, or use the floating toolbar above.</p></li></ul><h2>Next Steps</h2><ol><li><p>Edit this draft or create a new document from the menu.</p></li><li><p>Try uploading a <code>.txt</code>, <code>.md</code>, or <code>.docx</code> file.</p></li><li><p>Switch to <em>Bob Reyes</em> or <em>Carol Santos</em> in the top-right to verify <strong>Edit</strong> vs <strong>View only</strong> access.</p></li></ol>`,
            "usr_alice",
            earlier,
            now,
          ]
        );

        await db.query(
          `INSERT INTO ${tbl(db, "documents")} (id, title, content, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            "doc_roadmap",
            "Engineering Handoff Notes",
            `<h1>Engineering Handoff Notes</h1><p>Shared from Bob with <strong>View only</strong> access for Alice.</p><ul><li><p>API routes validate ownership and share permissions on every request.</p></li><li><p>Persistence uses Supabase Postgres in production with a zero-config local SQLite fallback.</p></li></ul>`,
            "usr_bob",
            earlier,
            earlier,
          ]
        );

        await db.query(
          `INSERT INTO ${tbl(db, "documents")} (id, title, content, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            "doc_scratch",
            "Personal Scratchpad",
            `<h1>Personal Scratchpad</h1><p>Private notes owned by Alice. Not shared with anyone else yet.</p>`,
            "usr_alice",
            earlier,
            earlier,
          ]
        );

        await db.query(
          `INSERT INTO ${tbl(db, "document_shares")} (id, document_id, user_id, permission, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (document_id, user_id) DO NOTHING`,
          ["shr_1", "doc_welcome", "usr_bob", "edit", now]
        );
        await db.query(
          `INSERT INTO ${tbl(db, "document_shares")} (id, document_id, user_id, permission, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (document_id, user_id) DO NOTHING`,
          ["shr_2", "doc_welcome", "usr_carol", "view", now]
        );
        await db.query(
          `INSERT INTO ${tbl(db, "document_shares")} (id, document_id, user_id, permission, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (document_id, user_id) DO NOTHING`,
          ["shr_3", "doc_roadmap", "usr_alice", "view", earlier]
        );
      }
    })();
  }
  await initPromise;
  return db;
}

export async function getUserById(userId: string): Promise<UserRecord | null> {
  const db = await ensureDb();
  const rows = await db.query(
    `SELECT id, name, email, avatar_color FROM ${tbl(db, "users")} WHERE id = ?`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatar_color: String(row.avatar_color),
  };
}

export async function getOrCreateUserByEmail(email: string): Promise<UserRecord> {
  const normalized = email.trim().toLowerCase();
  const db = await ensureDb();
  const existing = await db.query(
    `SELECT id, name, email, avatar_color FROM ${tbl(db, "users")} WHERE LOWER(email) = ?`,
    [normalized]
  );
  if (existing[0]) {
    const row = existing[0];
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      avatar_color: String(row.avatar_color),
    };
  }

  const localPart = normalized.split("@")[0] || "guest";
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  const palette = ["#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];
  const color = palette[normalized.length % palette.length];
  const id = `usr_${crypto.randomUUID().slice(0, 8)}`;

  await db.query(
    `INSERT INTO ${tbl(db, "users")} (id, name, email, avatar_color) VALUES (?, ?, ?, ?)`,
    [id, displayName || normalized, normalized, color]
  );

  return { id, name: displayName || normalized, email: normalized, avatar_color: color };
}

export async function listAllUsers(): Promise<UserRecord[]> {
  const db = await ensureDb();
  const orderBy = db.mode === "postgres" ? "created_seq ASC" : "rowid ASC";
  const rows = await db.query(
    `SELECT id, name, email, avatar_color FROM ${tbl(db, "users")} ORDER BY ${orderBy}`
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    avatar_color: String(r.avatar_color),
  }));
}

export async function listAccessibleDocuments(userId: string): Promise<DocumentRecord[]> {
  const db = await ensureDb();
  const rows = await db.query(
    `
      SELECT
        d.id, d.title, d.content, d.owner_id, d.created_at, d.updated_at,
        u.name AS owner_name, u.email AS owner_email,
        CASE
          WHEN d.owner_id = ? THEN 'owner'
          ELSE s.permission
        END AS permission
      FROM ${tbl(db, "documents")} d
      JOIN ${tbl(db, "users")} u ON u.id = d.owner_id
      LEFT JOIN ${tbl(db, "document_shares")} s ON s.document_id = d.id AND s.user_id = ?
      WHERE d.owner_id = ? OR s.user_id = ?
      ORDER BY d.updated_at DESC
    `,
    [userId, userId, userId, userId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    content: String(r.content),
    owner_id: String(r.owner_id),
    owner_name: String(r.owner_name),
    owner_email: String(r.owner_email),
    permission: String(r.permission) as "owner" | "edit" | "view",
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));
}

export async function getAccessibleDocument(
  docId: string,
  userId: string
): Promise<DocumentRecord | null> {
  const db = await ensureDb();
  const rows = await db.query(
    `
      SELECT
        d.id, d.title, d.content, d.owner_id, d.created_at, d.updated_at,
        u.name AS owner_name, u.email AS owner_email,
        CASE
          WHEN d.owner_id = ? THEN 'owner'
          ELSE s.permission
        END AS permission
      FROM ${tbl(db, "documents")} d
      JOIN ${tbl(db, "users")} u ON u.id = d.owner_id
      LEFT JOIN ${tbl(db, "document_shares")} s ON s.document_id = d.id AND s.user_id = ?
      WHERE d.id = ? AND (d.owner_id = ? OR s.user_id = ?)
      LIMIT 1
    `,
    [userId, userId, docId, userId, userId]
  );

  const r = rows[0];
  if (!r) return null;
  return {
    id: String(r.id),
    title: String(r.title),
    content: String(r.content),
    owner_id: String(r.owner_id),
    owner_name: String(r.owner_name),
    owner_email: String(r.owner_email),
    permission: String(r.permission) as "owner" | "edit" | "view",
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

export async function documentExists(docId: string): Promise<boolean> {
  const db = await ensureDb();
  const rows = await db.query(
    `SELECT 1 FROM ${tbl(db, "documents")} WHERE id = ? LIMIT 1`,
    [docId]
  );
  return rows.length > 0;
}

export async function createDocumentRecord(
  ownerId: string,
  title: string,
  content: string
): Promise<DocumentRecord> {
  const db = await ensureDb();
  const id = `doc_${crypto.randomUUID().slice(0, 10)}`;
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO ${tbl(db, "documents")} (id, title, content, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, content, ownerId, now, now]
  );
  const doc = await getAccessibleDocument(id, ownerId);
  if (!doc) throw new Error("Failed to read created document");
  return doc;
}

export async function updateDocumentRecord(
  docId: string,
  updates: { title?: string; content?: string }
): Promise<void> {
  const db = await ensureDb();
  const now = new Date().toISOString();
  if (updates.title !== undefined && updates.content !== undefined) {
    await db.query(
      `UPDATE ${tbl(db, "documents")} SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
      [updates.title, updates.content, now, docId]
    );
  } else if (updates.title !== undefined) {
    await db.query(
      `UPDATE ${tbl(db, "documents")} SET title = ?, updated_at = ? WHERE id = ?`,
      [updates.title, now, docId]
    );
  } else if (updates.content !== undefined) {
    await db.query(
      `UPDATE ${tbl(db, "documents")} SET content = ?, updated_at = ? WHERE id = ?`,
      [updates.content, now, docId]
    );
  }
}

export async function deleteDocumentRecord(docId: string): Promise<void> {
  const db = await ensureDb();
  await db.query(`DELETE FROM ${tbl(db, "documents")} WHERE id = ?`, [docId]);
}

export async function listDocumentShares(docId: string): Promise<ShareRecord[]> {
  const db = await ensureDb();
  const rows = await db.query(
    `
      SELECT s.id, s.document_id, s.user_id, s.permission, s.created_at,
             u.name AS user_name, u.email AS user_email, u.avatar_color
      FROM ${tbl(db, "document_shares")} s
      JOIN ${tbl(db, "users")} u ON u.id = s.user_id
      WHERE s.document_id = ?
      ORDER BY s.created_at ASC
    `,
    [docId]
  );

  return rows.map((r) => ({
    id: String(r.id),
    document_id: String(r.document_id),
    user_id: String(r.user_id),
    user_name: String(r.user_name),
    user_email: String(r.user_email),
    avatar_color: String(r.avatar_color),
    permission: String(r.permission) as "view" | "edit",
    created_at: String(r.created_at),
  }));
}

export async function upsertDocumentShare(
  docId: string,
  targetUserId: string,
  permission: "view" | "edit"
): Promise<ShareRecord[]> {
  const db = await ensureDb();
  const id = `shr_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await db.query(
    `
      INSERT INTO ${tbl(db, "document_shares")} (id, document_id, user_id, permission, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(document_id, user_id) DO UPDATE SET permission = excluded.permission
    `,
    [id, docId, targetUserId, permission, now]
  );
  return listDocumentShares(docId);
}

export async function removeDocumentShare(docId: string, targetUserId: string): Promise<ShareRecord[]> {
  const db = await ensureDb();
  await db.query(
    `DELETE FROM ${tbl(db, "document_shares")} WHERE document_id = ? AND user_id = ?`,
    [docId, targetUserId]
  );
  return listDocumentShares(docId);
}
