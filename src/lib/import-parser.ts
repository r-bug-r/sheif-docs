import mammoth from "mammoth";
import { marked } from "marked";
import { sanitizeTitle } from "./validation.ts";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripDangerousHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
}

function extractTitleFromHtml(html: string, fallbackName: string): string {
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const plain = h1Match[1].replace(/<[^>]+>/g, "").trim();
    if (plain) return sanitizeTitle(plain);
  }
  const baseName = fallbackName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return sanitizeTitle(baseName);
}

export async function parseUploadedBuffer(
  filename: string,
  ext: ".txt" | ".md" | ".docx",
  buffer: Buffer
): Promise<{ title: string; content: string }> {
  let html = "";

  if (ext === ".txt") {
    const text = buffer.toString("utf8").replace(/\r\n/g, "\n").trim();
    const paragraphs = text
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
    html = paragraphs.join("") || "<p></p>";
  } else if (ext === ".md") {
    const mdText = buffer.toString("utf8");
    const rendered = await marked.parse(mdText, { gfm: true, breaks: false });
    html = stripDangerousHtml(rendered);
  } else if (ext === ".docx") {
    const result = await mammoth.convertToHtml({ buffer });
    html = stripDangerousHtml(result.value || "<p></p>");
  }

  return {
    title: extractTitleFromHtml(html, filename),
    content: html || "<p></p>",
  };
}

export function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, "<u>$1</u>")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<li[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi, "- $1\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return md;
}
