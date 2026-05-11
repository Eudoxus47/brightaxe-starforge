import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CampaignConflictError, getCampaignDocument, isRedisConfigured, saveCampaignDocument } from "@/lib/campaign-store";
import type { CampaignSaveRequest } from "@/lib/forge-types";
import { isAuthConfigured, sessionCookieName, verifySessionToken } from "@/lib/starforge-auth";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function storageUnavailable() {
  return NextResponse.json(
    { error: "Upstash Redis is not configured.", code: "REDIS_NOT_CONFIGURED" },
    { status: 503 },
  );
}

function hasSession(request: NextRequest) {
  if (!isAuthConfigured()) return true;
  return verifySessionToken(request.cookies.get(sessionCookieName)?.value);
}

export async function GET(request: NextRequest) {
  if (!hasSession(request)) return unauthorized();
  if (!isRedisConfigured()) return storageUnavailable();

  try {
    return NextResponse.json({ document: await getCampaignDocument() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load campaign." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!hasSession(request)) return unauthorized();
  if (!isRedisConfigured()) return storageUnavailable();

  try {
    const body = (await request.json()) as CampaignSaveRequest;
    const document = await saveCampaignDocument(body);
    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof CampaignConflictError) {
      return NextResponse.json(
        { error: "Campaign changed elsewhere.", code: "REVISION_CONFLICT", document: error.document },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save campaign." }, { status: 400 });
  }
}
