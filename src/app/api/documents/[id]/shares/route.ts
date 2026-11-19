import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  documentExists,
  getAccessibleDocument,
  getOrCreateUserByEmail,
  listDocumentShares,
  removeDocumentShare,
  upsertDocumentShare,
} from "@/lib/db";
import { validateEmail, validatePermission } from "@/lib/validation";

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
        { error: exists ? "Forbidden" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    const shares = await listDocumentShares(id);
    return NextResponse.json({ shares });
  } catch (err) {
    console.error("[GET /api/documents/[id]/shares]", err);
    return NextResponse.json({ error: "Failed to load shares" }, { status: 500 });
  }
}

export async function POST(
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
        { error: exists ? "Forbidden" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    if (doc.permission !== "owner") {
      return NextResponse.json(
        { error: "Only the document owner can manage sharing." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { email?: unknown; permission?: unknown };
    const emailCheck = validateEmail(body.email);
    if (!emailCheck.ok) {
      return NextResponse.json({ error: emailCheck.error }, { status: 400 });
    }

    if (!validatePermission(body.permission)) {
      return NextResponse.json({ error: "Permission must be 'view' or 'edit'." }, { status: 400 });
    }

    if (emailCheck.email === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You are already the owner of this document." },
        { status: 400 }
      );
    }

    const targetUser = await getOrCreateUserByEmail(emailCheck.email);
    const shares = await upsertDocumentShare(id, targetUser.id, body.permission);
    return NextResponse.json({ shares });
  } catch (err) {
    console.error("[POST /api/documents/[id]/shares]", err);
    return NextResponse.json({ error: "Failed to update share" }, { status: 500 });
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
        { error: exists ? "Forbidden" : "Document not found" },
        { status: exists ? 403 : 404 }
      );
    }

    if (doc.permission !== "owner") {
      return NextResponse.json(
        { error: "Only the document owner can revoke sharing." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const shares = await removeDocumentShare(id, body.userId);
    return NextResponse.json({ shares });
  } catch (err) {
    console.error("[DELETE /api/documents/[id]/shares]", err);
    return NextResponse.json({ error: "Failed to remove share" }, { status: 500 });
  }
}
