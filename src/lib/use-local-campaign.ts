"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { allocateCommissionProjectHours, applyMonthlySimulation, createResolutionDraft, normalizeCampaignState, undoLastAppliedMonth } from "./forge-engine";
import { initialCampaignState } from "./seed";
import type { CampaignSaveRequest, CampaignState, MonthlyResolutionDraft, MonthlyResolutionSimulation, SharedCampaignDocument } from "./forge-types";

const storageKey = "brightaxe-starforge-campaign";
const draftStorageKey = "brightaxe-starforge-resolution-draft";
const undoStorageKey = "brightaxe-starforge-last-month-undo";

type SyncStatus = "loading" | "online" | "saving" | "offline" | "conflict" | "error";

function saveLocal(state: CampaignState, draft: MonthlyResolutionDraft, undoSnapshot: CampaignState | null) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
  window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  if (undoSnapshot) {
    window.localStorage.setItem(undoStorageKey, JSON.stringify(undoSnapshot));
  } else {
    window.localStorage.removeItem(undoStorageKey);
  }
}

function loadLocal() {
  let state = initialCampaignState;
  let draft = createResolutionDraft(initialCampaignState);
  let undoSnapshot: CampaignState | null = null;

  const saved = window.localStorage.getItem(storageKey);
  if (saved) {
    const normalized = normalizeCampaignState(JSON.parse(saved) as unknown);
    if (normalized) state = normalized;
  }

  const savedDraft = window.localStorage.getItem(draftStorageKey);
  if (savedDraft) {
    const parsedDraft = JSON.parse(savedDraft) as MonthlyResolutionDraft;
    draft =
      parsedDraft?.version === 1 && parsedDraft.month === state.currentMonth
        ? {
            ...parsedDraft,
            projectPlans: allocateCommissionProjectHours(state, parsedDraft.allocation.commissionWorkHours),
          }
        : createResolutionDraft(state);
  } else {
    draft = createResolutionDraft(state);
  }

  const savedUndo = window.localStorage.getItem(undoStorageKey);
  if (savedUndo) {
    undoSnapshot = normalizeCampaignState(JSON.parse(savedUndo) as unknown);
  }

  return { state, draft, undoSnapshot };
}

async function fetchCampaign() {
  const response = await fetch("/api/campaign", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(response.status === 503 ? "Shared storage is not configured; using this browser only." : "Could not load shared campaign.");
  }
  return ((await response.json()) as { document: SharedCampaignDocument }).document;
}

async function putCampaign(request: CampaignSaveRequest) {
  const response = await fetch("/api/campaign", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = (await response.json().catch(() => null)) as { document?: SharedCampaignDocument; error?: string } | null;
  if (response.status === 409 && payload?.document) {
    const error = new Error("Campaign changed elsewhere.");
    Object.assign(error, { document: payload.document });
    throw error;
  }
  if (!response.ok || !payload?.document) {
    throw new Error(payload?.error ?? "Could not save shared campaign.");
  }
  return payload.document;
}

export function useLocalCampaign() {
  const [state, rawSetState] = useState<CampaignState>(initialCampaignState);
  const [draft, rawSetDraft] = useState<MonthlyResolutionDraft>(() => createResolutionDraft(initialCampaignState));
  const [undoSnapshot, setUndoSnapshot] = useState<CampaignState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [sharedRevision, setSharedRevision] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("Connecting to shared campaign...");
  const [conflictDocument, setConflictDocument] = useState<SharedCampaignDocument | null>(null);
  const dirtyRef = useRef(false);
  const serverBackedRef = useRef(false);
  const stateRef = useRef(state);
  const draftRef = useRef(draft);
  const undoRef = useRef(undoSnapshot);
  const revisionRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    undoRef.current = undoSnapshot;
  }, [undoSnapshot]);

  const setState: Dispatch<SetStateAction<CampaignState>> = useCallback((value) => {
    dirtyRef.current = true;
    rawSetState(value);
  }, []);

  const setDraft: Dispatch<SetStateAction<MonthlyResolutionDraft>> = useCallback((value) => {
    dirtyRef.current = true;
    rawSetDraft(value);
  }, []);

  const applyDocument = useCallback((document: SharedCampaignDocument) => {
    dirtyRef.current = false;
    serverBackedRef.current = true;
    revisionRef.current = document.revision;
    setSharedRevision(document.revision);
    rawSetState(document.state);
    rawSetDraft(document.draft);
    setConflictDocument(null);
    setSyncStatus("online");
    setSyncMessage(`Shared campaign synced at revision ${document.revision}.`);
    saveLocal(document.state, document.draft, undoRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const document = await fetchCampaign();
        if (cancelled) return;
        applyDocument(document);
      } catch (error) {
        if (cancelled) return;
        try {
          const local = loadLocal();
          rawSetState(local.state);
          rawSetDraft(local.draft);
          setUndoSnapshot(local.undoSnapshot);
          setSyncStatus("offline");
          setSyncMessage(error instanceof Error ? error.message : "Using this browser only.");
        } catch {
          setSyncStatus("offline");
          setSyncMessage("Using seed campaign in this browser only.");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyDocument]);

  useEffect(() => {
    if (!hydrated) return;
    saveLocal(state, draft, undoSnapshot);
  }, [draft, hydrated, state, undoSnapshot]);

  useEffect(() => {
    if (!hydrated || !serverBackedRef.current || !dirtyRef.current || syncStatus === "conflict") return;
    const timeout = window.setTimeout(async () => {
      try {
        setSyncStatus("saving");
        const document = await putCampaign({
          state: stateRef.current,
          draft: draftRef.current,
          ifRevision: revisionRef.current ?? undefined,
          updatedBy: "table",
        });
        dirtyRef.current = false;
        revisionRef.current = document.revision;
        setSharedRevision(document.revision);
        setSyncStatus("online");
        setSyncMessage(`Shared campaign saved at revision ${document.revision}.`);
      } catch (error) {
        const document = (error as Error & { document?: SharedCampaignDocument }).document;
        if (document) {
          setConflictDocument(document);
          setSyncStatus("conflict");
          setSyncMessage("Campaign changed elsewhere before your save finished.");
          return;
        }
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "Shared save failed.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [draft, hydrated, state, syncStatus]);

  useEffect(() => {
    if (!hydrated || !serverBackedRef.current) return;
    const interval = window.setInterval(async () => {
      if (dirtyRef.current || syncStatus === "conflict") return;
      try {
        const document = await fetchCampaign();
        if (document.revision !== revisionRef.current) {
          applyDocument(document);
        }
      } catch (error) {
        setSyncStatus("error");
        setSyncMessage(error instanceof Error ? error.message : "Could not refresh shared campaign.");
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [applyDocument, hydrated, syncStatus]);

  async function reset() {
    const initialDraft = createResolutionDraft(initialCampaignState);
    setState(initialCampaignState);
    setDraft(initialDraft);
    setUndoSnapshot(null);
    setConflictDocument(null);
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.removeItem(undoStorageKey);

    if (!serverBackedRef.current) return;
    try {
      setSyncStatus("saving");
      const document = await putCampaign({
        state: initialCampaignState,
        draft: initialDraft,
        overwrite: true,
        updatedBy: "table-reset",
      });
      applyDocument(document);
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "Reset locally, but shared save did not update.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "brightaxe-starforge-campaign.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    const normalized = normalizeCampaignState(parsed);
    if (!normalized) {
      throw new Error("That file does not look like a Brightaxe Starforge save.");
    }
    setState(normalized);
    setDraft(createResolutionDraft(normalized));
    setUndoSnapshot(null);
  }

  function resetDraft() {
    setDraft(createResolutionDraft(state));
    window.localStorage.removeItem(draftStorageKey);
  }

  function applySimulation(simulation: MonthlyResolutionSimulation) {
    setUndoSnapshot(state);
    const nextState = applyMonthlySimulation(state, simulation);
    setState(nextState);
    setDraft(createResolutionDraft(nextState));
    window.localStorage.removeItem(draftStorageKey);
  }

  function undoLastMonth() {
    const restored = undoLastAppliedMonth(undoSnapshot);
    if (!restored) return false;
    setState(restored);
    setDraft(createResolutionDraft(restored));
    setUndoSnapshot(null);
    return true;
  }

  function reloadSharedCampaign() {
    if (!conflictDocument) return;
    applyDocument(conflictDocument);
  }

  async function overwriteSharedCampaign() {
    try {
      setSyncStatus("saving");
      const document = await putCampaign({
        state,
        draft,
        overwrite: true,
        updatedBy: "table",
      });
      applyDocument(document);
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage(error instanceof Error ? error.message : "Overwrite failed.");
    }
  }

  return {
    state,
    setState,
    draft,
    setDraft,
    hydrated,
    sharedRevision,
    syncStatus,
    syncMessage,
    hasConflict: Boolean(conflictDocument),
    canUndoLastMonth: Boolean(undoSnapshot),
    reset,
    resetDraft,
    exportJson,
    importJson,
    applySimulation,
    undoLastMonth,
    reloadSharedCampaign,
    overwriteSharedCampaign,
  };
}
