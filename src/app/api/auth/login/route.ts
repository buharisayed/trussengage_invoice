import { NextResponse } from "next/server";
import {
  constantTimeEqual,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const expected = process.env.APP_PASSWORD;

    if (!expected) {
      return NextResponse.json(
        { error: "APP_PASSWORD is not configured on the server." },
        { status: 503 }
      );
    }

    const provided = typeof body?.password === "string" ? body.password : "";
    if (!provided || !constantTimeEqual(provided, expected)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
