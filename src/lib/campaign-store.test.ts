import { describe, expect, it } from "vitest";
import { CampaignConflictError, createInitialCampaignDocument, getCampaignDocument, saveCampaignDocument } from "./campaign-store";
import type { CampaignKeyValueStore } from "./campaign-store";

function memoryStore(initial?: unknown): CampaignKeyValueStore {
  const values = new Map<string, unknown>();
  if (initial) values.set("campaign:brightaxe", initial);
  return {
    async get<T>(key: string) {
      return (values.get(key) as T | undefined) ?? null;
    },
    async set<T>(key: string, value: T) {
      values.set(key, value);
    },
  };
}

describe("shared campaign store", () => {
  it("initializes from the seed campaign when Redis is empty", async () => {
    const document = await getCampaignDocument(memoryStore());

    expect(document.revision).toBe(1);
    expect(document.state.profile.name).toBe("Taark Brightaxe");
    expect(document.draft.month).toBe(document.state.currentMonth);
  });

  it("increments revision on save", async () => {
    const store = memoryStore();
    const document = await getCampaignDocument(store);
    const saved = await saveCampaignDocument(
      {
        state: document.state,
        draft: document.draft,
        ifRevision: document.revision,
        updatedBy: "test",
      },
      store,
    );

    expect(saved.revision).toBe(2);
    expect(saved.updatedBy).toBe("test");
  });

  it("rejects stale saves with the current document", async () => {
    const current = createInitialCampaignDocument();
    const store = memoryStore({ ...current, revision: 4 });

    await expect(
      saveCampaignDocument(
        {
          state: current.state,
          draft: current.draft,
          ifRevision: 3,
        },
        store,
      ),
    ).rejects.toBeInstanceOf(CampaignConflictError);
  });
});
