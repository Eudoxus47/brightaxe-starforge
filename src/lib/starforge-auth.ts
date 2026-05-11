import { createHmac, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "starforge_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

interface SessionPayload {
  sub: "starforge";
  iat: number;
  exp: number;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAuthConfigured() {
  return Boolean(process.env.STARFORGE_PASSCODE && process.env.STARFORGE_SESSION_SECRET);
}

export function validatePasscode(passcode: string) {
  const expected = process.env.STARFORGE_PASSCODE;
  if (!expected) return false;
  return safeEqual(passcode, expected);
}

export function createSessionToken(now = Date.now()) {
  const secret = process.env.STARFORGE_SESSION_SECRET;
  if (!secret) {
    throw new Error("STARFORGE_SESSION_SECRET is not configured.");
  }
  const issuedAt = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sub: "starforge",
    iat: issuedAt,
    exp: issuedAt + sessionMaxAgeSeconds,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()) {
  const secret = process.env.STARFORGE_SESSION_SECRET;
  if (!secret || !token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;
  if (!safeEqual(signature, sign(encodedPayload, secret))) return false;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<SessionPayload>;
    return payload.sub === "starforge" && typeof payload.exp === "number" && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
