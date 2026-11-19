export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const MAX_TITLE_LENGTH = 160;
export const MAX_CONTENT_BYTES = 512 * 1024; // 512 KB HTML

export function sanitizeTitle(raw: unknown): string {
  if (typeof raw !== "string") return "Untitled Document";
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Untitled Document";
  return cleaned.slice(0, MAX_TITLE_LENGTH);
}

export function validateContent(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Document content must be a string." };
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_CONTENT_BYTES) {
    return { ok: false, error: "Document exceeds 512 KB size limit." };
  }
  return { ok: true, value: raw };
}

export function validateEmail(raw: unknown): { ok: true; email: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Email is required." };
  }
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, email };
}

export function validatePermission(raw: unknown): raw is "view" | "edit" {
  return raw === "view" || raw === "edit";
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx).toLowerCase();
}

export function validateUploadFile(
  filename: string,
  sizeBytes: number
): { ok: true; ext: (typeof ALLOWED_EXTENSIONS)[number] } | { ok: false; error: string } {
  const ext = getFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a .txt, .md, or .docx file.",
    };
  }
  if (sizeBytes <= 0) {
    return { ok: false, error: "Uploaded file is empty." };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds the 2 MB size limit." };
  }
  return { ok: true, ext: ext as (typeof ALLOWED_EXTENSIONS)[number] };
}
