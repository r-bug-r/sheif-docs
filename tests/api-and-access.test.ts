import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after, before, describe } from "node:test";
import { signUserId, verifySignedSession } from "../src/lib/session-crypto.ts";
import {
  createDocumentRecord,
  deleteDocumentRecord,
  ensureDb,
  getAccessibleDocument,
  listAccessibleDocuments,
  removeDocumentShare,
  resetDbForTests,
  updateDocumentRecord,
  upsertDocumentShare,
} from "../src/lib/db.ts";
import { parseUploadedBuffer, stripDangerousHtml } from "../src/lib/import-parser.ts";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "../src/lib/validation.ts";

let tmpDbPath = "";

describe("Ajaia Docs — Persistence, Upload & Access Control", () => {
  before(async () => {
    delete process.env.DATABASE_URL;
    tmpDbPath = path.join(os.tmpdir(), `ajaia-docs-test-${Date.now()}.db`);
    process.env.AJAIA_DB_PATH = tmpDbPath;
    resetDbForTests();
    await ensureDb();
  });

  after(() => {
    resetDbForTests();
    try {
      if (tmpDbPath && fs.existsSync(tmpDbPath)) fs.unlinkSync(tmpDbPath);
    } catch {
      // ignore Windows file lock cleanup
    }
  });

  test("creates, renames, updates content, and persists across re-fetch", async () => {
    const created = await createDocumentRecord("usr_alice", "Draft Spec", "<p>Initial</p>");
    assert.equal(created.title, "Draft Spec");
    assert.equal(created.permission, "owner");

    await updateDocumentRecord(created.id, {
      title: "Final Launch Spec",
      content: "<h1>Launch</h1><ul><li><p><strong>Ready</strong></p></li></ul>",
    });

    const reopened = await getAccessibleDocument(created.id, "usr_alice");
    assert.ok(reopened);
    assert.equal(reopened.title, "Final Launch Spec");
    assert.match(reopened.content, /<strong>Ready<\/strong>/);

    await deleteDocumentRecord(created.id);
    const deleted = await getAccessibleDocument(created.id, "usr_alice");
    assert.equal(deleted, null);
  });

  test("validates file types, size limits, and strips dangerous HTML on upload", async () => {
    assert.equal(validateUploadFile("notes.pdf", 1024).ok, false);
    assert.equal(validateUploadFile("empty.txt", 0).ok, false);
    assert.equal(validateUploadFile("huge.md", MAX_UPLOAD_BYTES + 1).ok, false);

    const mdCheck = validateUploadFile("roadmap-q4.md", 128);
    assert.equal(mdCheck.ok, true);

    const mdBuffer = Buffer.from("# Q4 Roadmap\n\n- **Ship** fast\n- Keep it clean\n", "utf8");
    const parsedMd = await parseUploadedBuffer("roadmap-q4.md", ".md", mdBuffer);
    assert.equal(parsedMd.title, "Q4 Roadmap");
    assert.match(parsedMd.content, /<strong>Ship<\/strong>/);

    const txtBuffer = Buffer.from("First paragraph.\n\nSecond line\ncontinued.", "utf8");
    const parsedTxt = await parseUploadedBuffer("meeting_notes.txt", ".txt", txtBuffer);
    assert.equal(parsedTxt.title, "meeting notes");
    assert.match(parsedTxt.content, /<p>First paragraph\.<\/p>/);

    const dirty = '<p onclick="alert(1)">Hi</p><script>alert(2)</script><a href="javascript:evil()">x</a>';
    const clean = stripDangerousHtml(dirty);
    assert.doesNotMatch(clean, /<script>/i);
    assert.doesNotMatch(clean, /onclick=/i);
    assert.doesNotMatch(clean, /javascript:/i);
  });

  test("enforces owner, edit, view, and private document access boundaries", async () => {
    // Seeded private doc owned by Alice
    const bobPrivateRead = await getAccessibleDocument("doc_scratch", "usr_bob");
    assert.equal(bobPrivateRead, null);

    // Alice creates a doc and shares View-only with Carol
    const doc = await createDocumentRecord("usr_alice", "Team Retro", "<p>Notes</p>");
    await upsertDocumentShare(doc.id, "usr_carol", "view");

    const carolView = await getAccessibleDocument(doc.id, "usr_carol");
    assert.ok(carolView);
    assert.equal(carolView.permission, "view");

    // Upgrade Carol to edit
    await upsertDocumentShare(doc.id, "usr_carol", "edit");
    const carolEdit = await getAccessibleDocument(doc.id, "usr_carol");
    assert.ok(carolEdit);
    assert.equal(carolEdit.permission, "edit");

    // Verify Carol sees it in accessible list as non-owner
    const carolList = await listAccessibleDocuments("usr_carol");
    const found = carolList.find((d) => d.id === doc.id);
    assert.ok(found);
    assert.equal(found.owner_name, "Alice Chen");

    // Revoke share
    await removeDocumentShare(doc.id, "usr_carol");
    const carolRevoked = await getAccessibleDocument(doc.id, "usr_carol");
    assert.equal(carolRevoked, null);

    await deleteDocumentRecord(doc.id);
  });

  test("signs and verifies session cookies and rejects tampered tokens", () => {
    const token = signUserId("usr_bob");
    assert.equal(verifySignedSession(token), "usr_bob");
    assert.equal(verifySignedSession(`${token}tampered`), null);
    assert.equal(verifySignedSession("usr_bob.deadbeef"), null);
  });
});
