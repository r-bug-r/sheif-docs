import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDocumentRecord, listAccessibleDocuments } from "@/lib/db";
import { stripDangerousHtml } from "@/lib/import-parser";
import { sanitizeTitle, validateContent } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const documents = await listAccessibleDocuments(user.id);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      content?: string;
    };

    const title = sanitizeTitle(body.title ?? "Untitled Document");
    const contentCheck = validateContent(body.content ?? "<p></p>");
    if (!contentCheck.ok) {
      return NextResponse.json({ error: contentCheck.error }, { status: 400 });
    }

    const cleanContent = stripDangerousHtml(contentCheck.value);
    const document = await createDocumentRecord(user.id, title, cleanContent);
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/documents]", err);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}
