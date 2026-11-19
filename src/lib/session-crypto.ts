import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "ajaia_session";

function getSecret(): string {
  return process.env.SESSION_SECRET || "ajaia-docs-local-dev-secret-2026";
}

export function signUserId(userId: string): string {
  const sig = crypto.createHmac("sha256", getSecret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifySignedSession(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(userId).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? userId : null;
}
