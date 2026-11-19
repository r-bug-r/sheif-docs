import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteDocumentRecord,
  documentExists,
  getAccessibleDocument,
  listDocumentShares,
  updateDocumentRecord,
} from "@/lib/db";
import { stripDangerousHtml } from "@/lib/import-parser";
import { sanitizeTitle, validateContent } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const doc = await getAccessibleDocument(id, user.id);

    if (!doc) {
      const exists = await documentExists(id);
      return NextResponse.json(
        { error: exists ? "You do not have access to this document" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    const shares = await listDocumentShares(id);
    return NextResponse.json({ document: doc, shares });
  } catch (err) {
    console.error("[GET /api/documents/[id]]", err);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const doc = await getAccessibleDocument(id, user.id);

    if (!doc) {
      const exists = await documentExists(id);
      return NextResponse.json(
        { error: exists ? "You do not have access to this document" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    if (doc.permission === "view") {
      return NextResponse.json(
        { error: "Read-only access. Ask the owner for edit permission." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { title?: unknown; content?: unknown };
    const updates: { title?: string; content?: string } = {};

    if (body.title !== undefined) {
      updates.title = sanitizeTitle(body.title);
    }

    if (body.content !== undefined) {
      const contentCheck = validateContent(body.content);
      if (!contentCheck.ok) {
        return NextResponse.json({ error: contentCheck.error }, { status: 400 });
      }
      updates.content = stripDangerousHtml(contentCheck.value);
    }

    if (updates.title === undefined && updates.content === undefined) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
    }

    await updateDocumentRecord(id, updates);
    const updated = await getAccessibleDocument(id, user.id);
    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error("[PATCH /api/documents/[id]]", err);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const doc = await getAccessibleDocument(id, user.id);

    if (!doc) {
      const exists = await documentExists(id);
      return NextResponse.json(
        { error: exists ? "You do not have access to this document" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    if (doc.permission !== "owner") {
      return NextResponse.json(
        { error: "Only the document owner can delete this document." },
        { status: 403 }
      );
    }

    await deleteDocumentRecord(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]]", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
