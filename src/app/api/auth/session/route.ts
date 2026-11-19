import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, SESSION_COOKIE_NAME, signUserId } from "@/lib/auth";
import { getOrCreateUserByEmail, getUserById, listAllUsers } from "@/lib/db";
import { validateEmail } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const headerUserId = req.headers.get("x-user-id");
    const user = await getCurrentUser(headerUserId);
    const users = await listAllUsers();
    return NextResponse.json({ user, users });
  } catch (err) {
    console.error("[GET /api/auth/session]", err);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId?: string; email?: string };
    let targetUser = null;

    if (body.userId) {
      targetUser = await getUserById(body.userId);
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } else if (body.email) {
      const check = validateEmail(body.email);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      targetUser = await getOrCreateUserByEmail(check.email);
    } else {
      return NextResponse.json({ error: "Provide userId or email" }, { status: 400 });
    }

    const users = await listAllUsers();
    const res = NextResponse.json({ user: targetUser, users });
    res.cookies.set(SESSION_COOKIE_NAME, signUserId(targetUser.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/session]", err);
    return NextResponse.json({ error: "Failed to switch session" }, { status: 500 });
  }
}
