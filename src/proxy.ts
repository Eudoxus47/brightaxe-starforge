import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthConfigured, sessionCookieName, verifySessionToken } from "@/lib/starforge-auth";

const publicPaths = ["/login", "/api/auth/unlock", "/api/auth/lock", "/api/auth/status"];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  const hasSession = verifySessionToken(request.cookies.get(sessionCookieName)?.value);

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname) || hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|woff2?)).*)"],
};
