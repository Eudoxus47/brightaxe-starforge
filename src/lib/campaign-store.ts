import { Redis } from "@upstash/redis";
import { createResolutionDraft, normalizeCampaignState, normalizeResolutionDraftForState } from "./forge-engine";
import type { CampaignSaveRequest, SharedCampaignDocument } from "./forge-types";
import { initialCampaignState } from "./seed";

export interface CampaignKeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<unknown>;
}

export class CampaignConflictError extends Error {
  constructor(public readonly document: SharedCampaignDocument) {
    super("Campaign revision conflict.");
  }
}

let redis: Redis | null = null;

export function campaignKey() {
  return process.env.STARFORGE_CAMPAIGN_KEY || "campaign:brightaxe";
}

function redisRestUrl() {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
}

function redisRestToken() {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
}

export function isRedisConfigured() {
  return Boolean(redisRestUrl() && redisRestToken());
}

function getRedis() {
  if (!isRedisConfigured()) {
    throw new Error("Upstash Redis is not configured.");
  }
  if (!redis) {
    redis = new Redis({
      url: redisRestUrl() as string,
      token: redisRestToken() as string,
    });
  }
  return redis;
}

function redisStore(): CampaignKeyValueStore {
  const client = getRedis();
  return {
    get: (key) => client.get(key),
    set: (key, value) => client.set(key, value),
  };
}

export function createInitialCampaignDocument(updatedBy = "system", now = new Date()): SharedCampaignDocument {
  return {
    state: initialCampaignState,
    draft: createResolutionDraft(initialCampaignState),
    revision: 1,
    updatedAt: now.toISOString(),
    updatedBy,
  };
}

export function normalizeSharedCampaignDocument(value: unknown): SharedCampaignDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SharedCampaignDocument>;
  const normalizedState = normalizeCampaignState(candidate.state);
  if (!normalizedState || candidate.draft?.version !== 1) return null;
  const draft = normalizeResolutionDraftForState(normalizedState, candidate.draft);

  return {
    state: normalizedState,
    draft,
    revision: Number.isFinite(candidate.revision) && candidate.revision ? Number(candidate.revision) : 1,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
    updatedBy: typeof candidate.updatedBy === "string" ? candidate.updatedBy : "unknown",
  };
}

export async function getCampaignDocument(store: CampaignKeyValueStore = redisStore()) {
  const key = campaignKey();
  const stored = normalizeSharedCampaignDocument(await store.get<SharedCampaignDocument>(key));
  if (stored) return stored;

  const initial = createInitialCampaignDocument();
  await store.set(key, initial);
  return initial;
}

export async function saveCampaignDocument(request: CampaignSaveRequest, store: CampaignKeyValueStore = redisStore()) {
  const key = campaignKey();
  const current = await getCampaignDocument(store);
  if (!request.overwrite && request.ifRevision !== current.revision) {
    throw new CampaignConflictError(current);
  }

  const normalizedState = normalizeCampaignState(request.state);
  if (!normalizedState || request.draft?.version !== 1) {
    throw new Error("Invalid campaign payload.");
  }

  const next: SharedCampaignDocument = {
    state: normalizedState,
    draft: normalizeResolutionDraftForState(normalizedState, request.draft),
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: request.updatedBy?.trim() || "table",
  };
  await store.set(key, next);
  return next;
}
