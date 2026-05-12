import { NextResponse } from "next/server";
import { isRedisConfigured } from "@/lib/campaign-store";
import { isAuthConfigured } from "@/lib/starforge-auth";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    authConfigured: isAuthConfigured(),
    redisConfigured: isRedisConfigured(),
    hasPasscode: Boolean(process.env.STARFORGE_PASSCODE),
    hasSessionSecret: Boolean(process.env.STARFORGE_SESSION_SECRET),
    redisEnvStyle: process.env.UPSTASH_REDIS_REST_URL
      ? "upstash"
      : process.env.KV_REST_API_URL
        ? "vercel-kv"
        : "missing",
  });
}
