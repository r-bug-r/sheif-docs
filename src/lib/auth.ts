import { cookies } from "next/headers";
import { getUserById, SEEDED_USERS, type UserRecord } from "./db";
import { SESSION_COOKIE_NAME, signUserId, verifySignedSession } from "./session-crypto";

export { SESSION_COOKIE_NAME, signUserId, verifySignedSession };

export async function getCurrentUser(headerUserId?: string | null): Promise<UserRecord> {
  if (headerUserId) {
    const user = await getUserById(headerUserId);
    if (user) return user;
  }

  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const verifiedId = verifySignedSession(raw);
    if (verifiedId) {
      const user = await getUserById(verifiedId);
      if (user) return user;
    }
  } catch {
    // cookies() unavailable outside Next.js request context
  }

  const fallback = await getUserById(SEEDED_USERS[0].id);
  return fallback ?? SEEDED_USERS[0];
}
