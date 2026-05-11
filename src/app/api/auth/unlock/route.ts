import { NextResponse } from "next/server";
import { createSessionToken, isAuthConfigured, sessionCookieName, sessionCookieOptions, validatePasscode } from "@/lib/starforge-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "Starforge passcode auth is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { passcode?: string } | null;
  if (!validatePasscode(body?.passcode ?? "")) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName, createSessionToken(), sessionCookieOptions());
  return response;
}
