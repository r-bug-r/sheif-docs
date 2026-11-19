import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDocumentRecord } from "@/lib/db";
import { parseUploadedBuffer } from "@/lib/import-parser";
import { validateUploadFile } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("x-user-id"));
    const formData = await req.formData();
    const file = formData.get("file");
    const previewOnly = formData.get("preview") === "true";

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const validation = validateUploadFile(file.name, file.size);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseUploadedBuffer(file.name, validation.ext, buffer);

    if (previewOnly) {
      return NextResponse.json({ preview: parsed, filename: file.name, size: file.size });
    }

    const document = await createDocumentRecord(user.id, parsed.title, parsed.content);
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/documents/upload]", err);
    return NextResponse.json(
      { error: "Could not parse uploaded file. Check that it is a valid .txt, .md, or .docx." },
      { status: 400 }
    );
  }
}
