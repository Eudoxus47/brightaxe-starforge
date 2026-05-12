"use client";

import {
  Anvil,
  CalendarDays,
  CircleDollarSign,
  Coins,
  Dice6,
  Download,
  Flame,
  Gem,
  Hammer,
  Home as HomeIcon,
  Music,
  Package,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Star,
  Swords,
  Upload,
  Users,
  Volume2,
  X,
} from "lucide-react";
import type { ChangeEvent, KeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  allocateCommissionProjectHours,
  defaultItemTypeForItem,
  defaultQualityGoalForItem,
  deriveCraftingStats,
  eventActors,
  forecastMonthlyPlan,
  getProjectRequirements,
  inventoryItemDisplayName,
  itemPrimaryMaterialLabel,
  itemRecipeSummary,
  materialRowsFromRecipe,
  qualityGoalLabel,
  resolveMonthlyDraft,
  rollDie,
  validateResolutionPlan,
} from "@/lib/forge-engine";
import type { CampaignState, Complexity, CraftItemType, CraftQualityGoal, EventActor, ForgeItem, ForgeProject, MaterialName, MonthlyResolutionDraft, MonthlyResolutionSimulation, SkillKey } from "@/lib/forge-types";
import { useLocalCampaign } from "@/lib/use-local-campaign";

const navItems = [
  { label: "Overview", icon: HomeIcon },
  { label: "Orders", icon: ScrollText },
  { label: "Production", icon: Hammer },
  { label: "Inventory", icon: Package },
  { label: "Resources", icon: Gem },
  { label: "Reputation", icon: Star },
  { label: "Ledger", icon: Coins },
  { label: "Events", icon: Sparkles },
  { label: "Upgrades", icon: Anvil },
  { label: "Visitors", icon: Users },
];

type InfoPanel = "overview" | "orders" | "production" | "inventory" | "resources" | "reputation" | "ledger" | "events" | "upgrades" | "visitors";

const skillOptions: Array<{ value: SkillKey; label: string }> = [
  { value: "armorsmithing", label: "Armor" },
  { value: "weaponsmithing", label: "Weapon" },
  { value: "blacksmithing", label: "Blacksmithing" },
  { value: "finesmithing", label: "Finesmithing" },
  { value: "locksmithing", label: "Locksmithing" },
];

const complexityOptions: Array<{ value: Complexity; label: string }> = [
  { value: "very-simple", label: "Very Simple" },
  { value: "simple", label: "Simple" },
  { value: "moderate", label: "Moderate" },
  { value: "complex", label: "Complex" },
  { value: "very-complex", label: "Very Complex" },
];

const qualityOptions: Array<{ value: CraftQualityGoal; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "masterwork", label: "Masterwork" },
  { value: "dwarvencraft", label: "Dwarvencraft" },
];

const itemTypeOptions: Array<{ value: CraftItemType; label: string }> = [
  { value: "armor", label: "Armor" },
  { value: "shield", label: "Shield" },
  { value: "weapon", label: "Weapon" },
  { value: "tool", label: "Tool" },
  { value: "other_metal", label: "Other Metal" },
];

const jordyMonthlyHourCap = 240;

function computedMonthlyHours(inputs: MonthlyResolutionDraft["hourInputs"]) {
  const baseTotal = Math.max(0, inputs.baseHours) + Math.max(0, inputs.ringOfSustenanceBonus) + Math.max(0, inputs.workaholicBonus);
  const eventPct = Math.max(-90, Math.min(200, inputs.eventHourModifier || 0));
  return Math.max(0, Math.round(baseTotal * (1 + eventPct / 100)));
}

export default function Home() {
  const {
    state,
    setState,
    draft,
    setDraft,
    reset,
    resetDraft,
    exportJson,
    importJson,
    applySimulation,
    undoLastMonth,
    canUndoLastMonth,
    sharedRevision,
    syncStatus,
    syncMessage,
    hasConflict,
    reloadSharedCampaign,
    overwriteSharedCampaign,
  } = useLocalCampaign();
  const [importError, setImportError] = useState("");
  const [resolutionError, setResolutionError] = useState("");
  const [activeInfoPanel, setActiveInfoPanel] = useState<InfoPanel | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [newCommission, setNewCommission] = useState({
    client: "",
    item: "",
    rewardGp: 1000,
    category: "armorsmithing" as SkillKey,
    complexity: "complex" as Complexity,
    itemType: "armor" as CraftItemType,
    qualityGoal: "dwarvencraft" as CraftQualityGoal,
    primaryMaterial: "Steel" as MaterialName,
    materialLbs: 20,
    specialMaterial: "" as "" | MaterialName,
    hoursOverride: 0,
    craftDcOverride: 0,
    take10: false,
  });

  const activeProjects = state.projects.filter((project) => project.status === "queued" || project.status === "in_progress");
  const outlook = useMemo(() => {
    const targetNet = state.profile.dmTargetProfitGp;
    const projectPressure = Math.min(650, activeProjects.length * 125);
    const reputationStability = Math.max(-150, Math.min(220, (state.profile.reputation - 10) * 22));
    const repairDelta = Math.round((Math.max(0, state.labor.repairs || 0) - 40) * 4);
    const projectedNet = Math.max(0, Math.round(targetNet + projectPressure + reputationStability + repairDelta));
    const projectedExpenses = state.profile.genericShopCostsGp;
    const sigma = Math.max(
      450,
      Math.round(state.profile.dmTargetVolatilityGp - state.profile.reputation * 18 + activeProjects.length * 80),
    );

    return {
      projectedShop: Math.max(0, projectedNet + projectedExpenses),
      projectedExpenses,
      materialSavings: 0,
      projectedNet,
      sigma,
      min: Math.max(0, projectedNet - sigma),
      max: projectedNet + sigma,
    };
  }, [
    activeProjects.length,
    state.labor.repairs,
    state.profile.genericShopCostsGp,
    state.profile.dmTargetProfitGp,
    state.profile.dmTargetVolatilityGp,
    state.profile.reputation,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicEnabled) {
      audio.pause();
      return;
    }
    audio.volume = 0.36;
    audio.play().catch(() => setMusicEnabled(false));
  }, [musicEnabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 0.12;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => undefined);
    });
  }, []);

  function updateMaterial(material: MaterialName, value: number) {
    setState((current) => ({
      ...current,
      materials: {
        ...current.materials,
        [material]: {
          ...current.materials[material],
          lbs: Math.max(0, value),
        },
      },
    }));
  }

  function updateInventory(id: string, update: { quantity?: number; target?: number }) {
    setState((current) => ({
      ...current,
      inventory: current.inventory.map((stock) =>
        stock.id === id
          ? {
              ...stock,
              quantity: update.quantity === undefined ? stock.quantity : Math.max(0, update.quantity),
              target: update.target === undefined ? stock.target : Math.max(0, update.target),
            }
          : stock,
      ),
    }));
  }

  function updateProfile(update: Partial<CampaignState["profile"]>) {
    setState((current) => ({ ...current, profile: { ...current.profile, ...update } }));
    setDraft((current) => ({ ...current, forecast: undefined, simulation: undefined }));
  }

  function updateProject(id: string, update: Partial<Pick<ForgeProject, "client" | "trueContractValue" | "requiredHours" | "hoursInvested" | "craftDc" | "priority" | "notes" | "item" | "take10" | "resolutionMode" | "hoursOverride" | "craftDcOverride" | "marketPriceOverrideGp" | "rawMaterialCostOverrideGp">>) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) => {
        if (project.id !== id) return project;
        const item = update.item ?? project.item;
        const stats = deriveCraftingStats(item, current.profile);
        const trueContractValue = update.trueContractValue ?? project.trueContractValue;
        const materialCost = update.rawMaterialCostOverrideGp ?? project.rawMaterialCostOverrideGp ?? stats.rawMaterialCostGp;
        const resolutionMode = update.resolutionMode ?? project.resolutionMode;
        const requiredHours = update.requiredHours ?? (resolutionMode === "craftingPdf" ? stats.hours : project.requiredHours);
        const craftDc = update.craftDc ?? (resolutionMode === "craftingPdf" ? stats.dc : project.craftDc);
        return {
          ...project,
          ...update,
          item,
          itemType: stats.itemType,
          resolutionMode,
          trueContractValue,
          listedItemValue: update.marketPriceOverrideGp ?? stats.marketPriceGp,
          laborFee: Math.max(0, trueContractValue - materialCost),
          trueMargin: Math.max(0, trueContractValue - materialCost - project.specialExpenses),
          materialCost,
          requiredHours,
          craftDc,
          materials: materialRowsFromRecipe(item.materialRecipe, project.materialSupplyMode === "client_supplies" ? "client" : "taark", project.materialSupplyMode === "client_reimburses"),
          hoursInvested: Math.min(Math.max(0, update.hoursInvested ?? project.hoursInvested), requiredHours),
        };
      }),
    }));
    setDraft((current) => ({ ...current, forecast: undefined, simulation: undefined }));
  }

  function addCommission() {
    if (!newCommission.client.trim() || !newCommission.item.trim()) return;
    const id = `custom-${Date.now()}`;
    const item: ForgeItem = {
      name: newCommission.item.trim(),
      category: newCommission.category,
      itemType: newCommission.itemType,
      complexity: newCommission.complexity,
      basePriceGp: newCommission.rewardGp,
      masterwork: newCommission.qualityGoal !== "standard",
      qualityGoal: newCommission.qualityGoal,
      specialMaterial: newCommission.specialMaterial || undefined,
      materialRecipe: { [newCommission.primaryMaterial]: Math.max(0, newCommission.materialLbs) },
    };
    const stats = deriveCraftingStats(item, state.profile);
    const requiredHours = newCommission.hoursOverride > 0 ? newCommission.hoursOverride : stats.hours;
    const craftDc = newCommission.craftDcOverride > 0 ? newCommission.craftDcOverride : stats.dc;

    setState((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id,
          name: item.name,
          client: newCommission.client.trim(),
          kind: "paid_commission",
          economicMode: "profit_bearing",
          materialSupplyMode: "taark_supplies",
          payoutMode: "true_contract_value",
          item,
          itemType: stats.itemType,
          priority: "medium",
          status: "queued",
          trueContractValue: newCommission.rewardGp,
          listedItemValue: stats.marketPriceGp,
          materialCost: stats.rawMaterialCostGp,
          specialExpenses: 0,
          laborFee: Math.max(0, newCommission.rewardGp - stats.rawMaterialCostGp),
          trueMargin: Math.max(0, newCommission.rewardGp - stats.rawMaterialCostGp),
          requiredHours,
          hoursInvested: 0,
          craftDc,
          prestige: 1,
          reputationEffectOnCompletion: 1,
          materials: materialRowsFromRecipe(item.materialRecipe),
          notes: "Custom table commission.",
          resolutionMode: newCommission.hoursOverride > 0 || newCommission.craftDcOverride > 0 ? "fixedHours" : "craftingPdf",
          take10: newCommission.take10,
          hoursOverride: newCommission.hoursOverride || undefined,
          craftDcOverride: newCommission.craftDcOverride || undefined,
        },
      ],
      labor: {
        ...current.labor,
        projectHours: {
          ...current.labor.projectHours,
          [id]: 0,
        },
      },
    }));
    setNewCommission({
      client: "",
      item: "",
      rewardGp: 1000,
      category: "armorsmithing",
      complexity: "complex",
      itemType: "armor",
      qualityGoal: "dwarvencraft",
      primaryMaterial: "Steel",
      materialLbs: 20,
      specialMaterial: "",
      hoursOverride: 0,
      craftDcOverride: 0,
      take10: false,
    });
    setDraft((current) => ({
      ...current,
      projectPlans: [
        ...current.projectPlans,
        { projectId: id, selected: false, allocatedHours: 0, nominalHours: requiredHours, protectedHours: requiredHours, bufferHours: 0, fundingStatus: "unfunded" },
      ],
      projectRolls: [...current.projectRolls, { projectId: id }],
    }));
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importJson(file);
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-frame">
        <audio ref={audioRef} src="/tavern-ambient.mp3" loop preload="auto" />
        <LeftColumn state={state} activeInfoPanel={activeInfoPanel} onToggleInfo={setActiveInfoPanel} />

        <section className="dashboard-center">
          <TopBar state={state} />
          <SyncStatusBanner
            status={syncStatus}
            message={syncMessage}
            revision={sharedRevision}
            hasConflict={hasConflict}
            onReload={reloadSharedCampaign}
            onOverwrite={overwriteSharedCampaign}
          />
          <ForgeStage videoRef={videoRef} />

          <div className="center-panels">
            <WorkQueue state={state} projects={activeProjects} onUpdateProject={updateProject} />
          </div>
        </section>

        <RightColumn
          state={state}
          outlook={outlook}
          draft={draft}
          setDraft={setDraft}
          onApplySimulation={applySimulation}
          onResetDraft={resetDraft}
          onUndoLastMonth={undoLastMonth}
          canUndoLastMonth={canUndoLastMonth}
          resolutionError={resolutionError}
          setResolutionError={setResolutionError}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <nav className="nav-rail ornate-panel">
          <button type="button" className={`now-playing ${musicEnabled ? "active" : ""}`} onClick={() => setMusicEnabled((current) => !current)}>
            {musicEnabled ? <Volume2 className="size-5" /> : <Music className="size-5" />}
            <div>
              <span>Now Playing</span>
              <strong>{musicEnabled ? "Forge loop active" : "Start music loop"}</strong>
              <small>Tavern ambient</small>
            </div>
          </button>
          {navItems.map((item) => {
            const Icon = item.icon;
            const panel = item.label.toLowerCase() as InfoPanel;
            return (
              <button
                key={item.label}
                type="button"
                className={`nav-button ${activeInfoPanel === panel ? "active" : ""}`}
                onClick={() => setActiveInfoPanel((current) => (current === panel ? null : panel))}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <MaterialsInventoryPanel state={state} onUpdateMaterial={updateMaterial} />
        </nav>

        <ForgeInventoryBand state={state} onUpdateInventory={updateInventory} />

        <ResourcesPanel
          state={state}
          newCommission={newCommission}
          setNewCommission={setNewCommission}
          onAddCommission={addCommission}
          onExportJson={exportJson}
          onImportJson={handleImport}
          onReset={reset}
          onUpdateProfile={updateProfile}
          importError={importError}
        />
        {settingsOpen && <RulesSettingsOverlay state={state} onUpdateProfile={updateProfile} onClose={() => setSettingsOpen(false)} />}
        {activeInfoPanel && <InfoPopup panel={activeInfoPanel} state={state} projects={activeProjects} onClose={() => setActiveInfoPanel(null)} />}
      </div>
    </main>
  );
}

function LeftColumn({
  state,
  activeInfoPanel,
  onToggleInfo,
}: {
  state: ReturnType<typeof useLocalCampaign>["state"];
  activeInfoPanel: InfoPanel | null;
  onToggleInfo: (panel: InfoPanel | null) => void;
}) {
  return (
    <aside id="overview" className="identity-card ornate-panel">
      <div className="portrait-frame" role="img" aria-label="Portrait of Taark Brightaxe" />
      <div className="identity-copy">
        <h1>Brightaxe Starforge</h1>
        <strong>{state.profile.name}</strong>
        <p>{state.profile.title}</p>
        <small>{state.monthLabel}</small>
      </div>
      <button className="identity-info-button" type="button" onClick={() => onToggleInfo(activeInfoPanel === "overview" ? null : "overview")}>
        <Sparkles className="size-4" />
        Info
      </button>
    </aside>
  );
}

function TopBar({ state }: { state: ReturnType<typeof useLocalCampaign>["state"] }) {
  return (
    <header className="top-bar">
      <OrnateBox>
        <CalendarDays className="size-4 text-[#e5b56b]" />
        <span>{state.monthLabel}</span>
        <small>Waterdeep campaign calendar</small>
      </OrnateBox>
      <OrnateBox>
        <Star className="size-4 text-[#77bfd0]" />
        <span>Waterdeep, City of Splendors</span>
        <small>The Mermaid, Dock Ward</small>
      </OrnateBox>
    </header>
  );
}

function ForgeStage({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  return (
    <section className="forge-art-panel">
      <video ref={videoRef} className="forge-art" autoPlay loop playsInline poster="/brightaxe-forge-backdrop.png" aria-label="Animated view of the Brightaxe forge">
        <source src="/brightaxe-forge-loop.mp4" type="video/mp4" />
      </video>
      <div className="forge-vignette" />
    </section>
  );
}

function RightColumn({
  state,
  outlook,
  draft,
  setDraft,
  onApplySimulation,
  onResetDraft,
  onUndoLastMonth,
  canUndoLastMonth,
  resolutionError,
  setResolutionError,
  onOpenSettings,
}: {
  state: CampaignState;
  outlook: {
    projectedShop: number;
    projectedExpenses: number;
    materialSavings: number;
    projectedNet: number;
    sigma: number;
    min: number;
    max: number;
  };
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onApplySimulation: (simulation: MonthlyResolutionSimulation) => void;
  onResetDraft: () => void;
  onUndoLastMonth: () => boolean;
  canUndoLastMonth: boolean;
  resolutionError: string;
  setResolutionError: (value: string) => void;
  onOpenSettings: () => void;
}) {
  const activeCount = state.projects.filter((project) => project.status === "queued" || project.status === "in_progress").length;
  const completedCount = state.projects.filter((project) => project.status === "completed" || project.status === "delivered").length;
  const latestLedger = state.ledger[0];

  return (
    <aside id="production" className="dm-column">
      <section className="ornate-panel dm-title">
        <div>
          <span>Eye</span>
          <h2>DM Dashboard</h2>
        </div>
        <button className="icon-button" type="button" onClick={onOpenSettings} title="Open rules and economy settings">
          <Settings className="size-5" />
        </button>
      </section>

      <section className="ornate-panel">
        <PanelTitle icon={CircleDollarSign} title="Monthly Outlook" />
        <StatRow label="Expected Net" value={`${outlook.projectedNet.toLocaleString()} gp`} />
        <StatRow label="Sigma" value={`+/- ${outlook.sigma.toLocaleString()} gp`} />
        <StatRow label="One-Sigma Band" value={`${outlook.min.toLocaleString()} - ${outlook.max.toLocaleString()} gp`} />
        <StatRow label="Fixed Misc Costs" value={`${outlook.projectedExpenses.toLocaleString()} gp`} />
        <StatRow label="Target Net" value={`${state.profile.dmTargetProfitGp.toLocaleString()} gp`} />
        <StatRow label="Reputation" value={`${state.profile.reputation}/${state.profile.maxReputation}`} />
        <StatRow label="Event Mode" value="Roll popup" />
      </section>

      <section className="ornate-panel">
        <PanelTitle icon={Flame} title="Profit Distribution" />
        <div className="profit-chart">
          <div className="bell-curve" />
          <span className="axis axis-left">{outlook.min.toLocaleString()}</span>
          <span className="axis axis-mid">{outlook.projectedNet.toLocaleString()}</span>
          <span className="axis axis-right">{outlook.max.toLocaleString()}</span>
        </div>
      </section>

      <section className="ornate-panel resolution-panel">
        <ResolutionWizard
          state={state}
          draft={draft}
          setDraft={setDraft}
          onApplySimulation={onApplySimulation}
          onResetDraft={onResetDraft}
          onUndoLastMonth={onUndoLastMonth}
          canUndoLastMonth={canUndoLastMonth}
          resolutionError={resolutionError}
          setResolutionError={setResolutionError}
        />
      </section>
      <ShopSummary
        state={state}
        activeCount={activeCount}
        completedCount={completedCount}
        latestLedger={latestLedger}
        projectedExpenses={outlook.projectedExpenses}
      />
    </aside>
  );
}

const stageLabels: Record<MonthlyResolutionDraft["stage"], string> = {
  planning: "Plan",
  forecast: "Forecast",
  rolls: "Rolls",
  playback: "Playback",
  ledger: "Ledger",
};

const playbackDelay = {
  slow: 3500,
  normal: 2200,
  fast: 1000,
};

const allocationControls: Array<{
  key: keyof MonthlyResolutionDraft["allocation"];
  label: string;
  tone: string;
}> = [
  { key: "commissionWorkHours", label: "Commission Work", tone: "ember" },
  { key: "genericShopWorkHours", label: "Shelf Goods", tone: "brass" },
  { key: "repairsWalkinsHours", label: "Repairs", tone: "teal" },
  { key: "jordyTrainingHours", label: "Jordy", tone: "violet" },
];

function ResolutionWizard({
  state,
  draft,
  setDraft,
  onApplySimulation,
  onResetDraft,
  onUndoLastMonth,
  canUndoLastMonth,
  resolutionError,
  setResolutionError,
}: {
  state: CampaignState;
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onApplySimulation: (simulation: MonthlyResolutionSimulation) => void;
  onResetDraft: () => void;
  onUndoLastMonth: () => boolean;
  canUndoLastMonth: boolean;
  resolutionError: string;
  setResolutionError: (value: string) => void;
}) {
  useEffect(() => {
    if (draft.stage !== "playback" || !draft.playback.autoplay || !draft.simulation) return;
    if (draft.playback.cardIndex >= draft.simulation.cards.length - 1) return;
    const timeout = window.setTimeout(() => {
      setDraft((current) => ({
        ...current,
        playback: {
          ...current.playback,
          cardIndex: Math.min((current.simulation?.cards.length ?? 1) - 1, current.playback.cardIndex + 1),
        },
      }));
    }, playbackDelay[draft.playback.speed]);
    return () => window.clearTimeout(timeout);
  }, [draft.playback.autoplay, draft.playback.cardIndex, draft.playback.speed, draft.simulation, draft.stage, setDraft]);

  function updateDraft(update: Partial<MonthlyResolutionDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setResolutionError("");
  }

  function continueToForecast() {
    const nextDraft = {
      ...draft,
      hourInputs: {
        ...draft.hourInputs,
        totalAvailableHours: computedMonthlyHours(draft.hourInputs),
      },
    };
    const warnings = validateResolutionPlan(state, nextDraft);
    const forecast = forecastMonthlyPlan(state, nextDraft);
    setDraft({ ...nextDraft, stage: "forecast", warnings, forecast, simulation: undefined });
  }

  function proceedToRolls() {
    updateDraft({ stage: "rolls" });
  }

  function simulateMonth() {
    try {
      const simulation = resolveMonthlyDraft(state, draft);
      setDraft({
        ...draft,
        stage: "playback",
        simulation,
        forecast: simulation.forecast,
        playback: { ...draft.playback, cardIndex: 0, autoplay: false },
      });
      setResolutionError("");
    } catch (error) {
      setResolutionError(error instanceof Error ? error.message : "Simulation failed.");
    }
  }

  function applyMonth() {
    if (!draft.simulation) return;
    onApplySimulation(draft.simulation);
    setResolutionError("");
  }

  return (
    <>
      <PanelTitle icon={Dice6} title="Monthly Resolution" />
      <div className="wizard-steps">
        {(Object.keys(stageLabels) as Array<MonthlyResolutionDraft["stage"]>).map((stage) => (
          <span key={stage} className={draft.stage === stage ? "active" : ""}>
            {stageLabels[stage]}
          </span>
        ))}
      </div>
      {resolutionError && <p className="error-text">{resolutionError}</p>}
      {draft.stage === "planning" && (
        <PlanningStage
          state={state}
          draft={draft}
          setDraft={setDraft}
          onContinue={continueToForecast}
          onResetDraft={onResetDraft}
          onUndoLastMonth={onUndoLastMonth}
          canUndoLastMonth={canUndoLastMonth}
        />
      )}
      {draft.stage === "forecast" && (
        <ForecastStage draft={draft} setDraft={setDraft} onBack={() => updateDraft({ stage: "planning" })} onProceed={proceedToRolls} />
      )}
      {draft.stage === "rolls" && (
        <>
          <EventModeDock
            title="Event Roll Mode"
            detail="Enter the d20s in the center popup, then resolve the month."
          />
          <ResolutionOverlay title="Event Roll Mode">
            <RollStage state={state} draft={draft} setDraft={setDraft} onBack={() => updateDraft({ stage: "forecast" })} onSimulate={simulateMonth} />
          </ResolutionOverlay>
        </>
      )}
      {draft.stage === "playback" && draft.simulation && (
        <>
          <EventModeDock
            title="Event Playback"
            detail="The income and probability pane updates as each event card resolves."
          />
          <ResolutionOverlay title="Event Resolution">
            <PlaybackStage draft={draft} setDraft={setDraft} onReport={() => updateDraft({ stage: "ledger" })} />
          </ResolutionOverlay>
        </>
      )}
      {draft.stage === "ledger" && draft.simulation && (
        <ResolutionOverlay title="Monthly Ledger">
          <LedgerStage
            draft={draft}
            setDraft={setDraft}
            onApply={applyMonth}
            onPlanning={() => updateDraft({ stage: "planning" })}
            onDiscard={() => updateDraft({ stage: "planning", simulation: undefined })}
          />
        </ResolutionOverlay>
      )}
    </>
  );
}

function EventModeDock({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="event-mode-dock">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function ResolutionOverlay({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="resolution-overlay">
      <section className="resolution-modal ornate-panel">
        <div className="modal-title">
          <PanelTitle icon={Sparkles} title={title} />
        </div>
        {children}
      </section>
    </div>
  );
}

function PlanningStage({
  state,
  draft,
  setDraft,
  onContinue,
  onResetDraft,
  onUndoLastMonth,
  canUndoLastMonth,
}: {
  state: CampaignState;
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onContinue: () => void;
  onResetDraft: () => void;
  onUndoLastMonth: () => boolean;
  canUndoLastMonth: boolean;
}) {
  const active = state.projects.filter((project) => project.status === "queued" || project.status === "in_progress");
  const selectedProjectHours = draft.projectPlans.reduce((total, plan) => total + plan.allocatedHours, 0);
  const warnings = validateResolutionPlan(state, draft);
  const totalAvailable = computedMonthlyHours(draft.hourInputs);
  const plannedTotal =
    draft.allocation.commissionWorkHours +
    draft.allocation.genericShopWorkHours +
    draft.allocation.repairsWalkinsHours +
    draft.allocation.jordyTrainingHours;
  const liveForecast = useMemo(() => forecastMonthlyPlan(state, draft, 350), [draft, state]);

  function updateHours(key: keyof MonthlyResolutionDraft["hourInputs"], value: number) {
    setDraft((current) => {
      const hourInputs = { ...current.hourInputs, [key]: value };
      return {
        ...current,
        hourInputs: {
          ...hourInputs,
          totalAvailableHours: computedMonthlyHours(hourInputs),
        },
        simulation: undefined,
      };
    });
  }

  function updateAllocation(key: keyof MonthlyResolutionDraft["allocation"], value: number) {
      const maxHours = key === "jordyTrainingHours" ? Math.min(jordyMonthlyHourCap, Math.max(0, totalAvailable)) : Math.max(0, totalAvailable);
      const nextValue = Math.min(maxHours, Math.max(0, Math.round(value)));
    setDraft((current) => {
      const otherKeys = allocationControls.map((control) => control.key).filter((candidate) => candidate !== key);
      const remaining = Math.max(0, maxHours - nextValue);
      const otherTotal = otherKeys.reduce((total, candidate) => total + Math.max(0, current.allocation[candidate]), 0);
      let assigned = 0;
      const allocation = { ...current.allocation, [key]: nextValue };

      otherKeys.forEach((candidate, index) => {
        const share =
          index === otherKeys.length - 1
            ? remaining - assigned
            : Math.floor(remaining * (otherTotal > 0 ? Math.max(0, current.allocation[candidate]) / otherTotal : 1 / otherKeys.length));
        allocation[candidate] = Math.min(candidate === "jordyTrainingHours" ? jordyMonthlyHourCap : maxHours, Math.max(0, share));
        assigned += allocation[candidate];
      });

      return {
        ...current,
        allocation,
        projectPlans:
          key === "commissionWorkHours" || allocation.commissionWorkHours !== current.allocation.commissionWorkHours
            ? allocateCommissionProjectHours(state, allocation.commissionWorkHours)
            : current.projectPlans,
        forecast: undefined,
        simulation: undefined,
      };
    });
  }

  return (
    <div className="wizard-body">
      <div className="summary-strip">
        <StatRow label="Available" value={`${totalAvailable}h`} />
        <StatRow label="Allocated" value={`${plannedTotal}h`} />
        <StatRow label="Project Split" value={`${selectedProjectHours}/${draft.allocation.commissionWorkHours}h`} />
      </div>
      <div className="hour-input-grid">
        <NumberField label="Base Hours" value={draft.hourInputs.baseHours} onChange={(value) => updateHours("baseHours", value)} />
        <NumberField label="Ring Bonus" value={draft.hourInputs.ringOfSustenanceBonus} onChange={(value) => updateHours("ringOfSustenanceBonus", value)} />
        <NumberField label="Workaholic" value={draft.hourInputs.workaholicBonus} onChange={(value) => updateHours("workaholicBonus", value)} />
        <NumberField label="Event Mod %" value={draft.hourInputs.eventHourModifier} onChange={(value) => updateHours("eventHourModifier", value)} />
      </div>
      <div className="slider-stack">
        {allocationControls.map((control) => (
          <AllocationSlider
            key={control.key}
            label={control.label}
            value={draft.allocation[control.key]}
            max={control.key === "jordyTrainingHours" ? Math.min(jordyMonthlyHourCap, totalAvailable) : totalAvailable}
            tone={control.tone}
            onChange={(value) => updateAllocation(control.key, value)}
          />
        ))}
      </div>
      <ForecastStatBars forecast={liveForecast} projects={active} compact />
      <CommissionCompletionEstimate forecast={liveForecast} projects={active} />
      <div className="project-plan-list">
        {active.map((project) => {
          const plan = draft.projectPlans.find((candidate) => candidate.projectId === project.id) ?? {
            projectId: project.id,
            selected: false,
            allocatedHours: 0,
            nominalHours: Math.max(0, getProjectRequirements(project, state).hours - project.hoursInvested),
            protectedHours: Math.max(0, getProjectRequirements(project, state).hours - project.hoursInvested),
            bufferHours: 0,
            fundingStatus: "unfunded" as const,
          };
          const requirements = getProjectRequirements(project, state);
          const remaining = Math.max(0, requirements.hours - project.hoursInvested);
          const chance = liveForecast.probabilityEachProjectCompletes[project.id] ?? 0;
          const fundingNote =
            plan.fundingStatus === "buffered"
              ? `Funded + ${plan.bufferHours}h buffer`
              : plan.fundingStatus === "funded"
                ? "Fully funded; odds reflect roll quality"
                : plan.fundingStatus === "partial"
                  ? `${Math.max(0, plan.nominalHours - plan.allocatedHours)}h short of full funding`
                  : "Not funded";
          return (
            <div key={project.id} className={`project-plan-row ${plan.allocatedHours > 0 ? "allocated" : ""} ${plan.fundingStatus}`}>
              <span>
                <strong>{project.name}</strong>
                <small>{project.priority} | {project.hoursInvested}/{requirements.hours}h | DC {requirements.dc}</small>
              </span>
              <em>
                {plan.allocatedHours}h
                <small>{plan.nominalHours}h full</small>
              </em>
              <small>{remaining}h left | {Math.round(chance * 100)}%<br />{fundingNote}</small>
            </div>
          );
        })}
      </div>
      <WarningList warnings={warnings} />
      <div className="wizard-actions">
        <button className="small-button" onClick={onResetDraft}>Reset Draft</button>
        <button className="small-button" disabled={!canUndoLastMonth} onClick={onUndoLastMonth}>Undo Last Month</button>
        <button className="resolve-button" onClick={onContinue}>Submit Allocation</button>
      </div>
    </div>
  );
}

function ForecastStage({
  draft,
  setDraft,
  onBack,
  onProceed,
}: {
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onBack: () => void;
  onProceed: () => void;
}) {
  const forecast = draft.forecast;
  if (!forecast) return null;
  const projectsById = new Map(draft.projectPlans.map((plan) => [plan.projectId, plan]));
  return (
    <div className="wizard-body">
      <div className="summary-strip">
        <StatRow label="Expected Net" value={`${forecast.expectedTotalProfit.toLocaleString()} gp`} />
        <StatRow label="Sigma" value={`+/- ${forecast.profitSigma.toLocaleString()} gp`} />
        <StatRow label="P10/P50/P90" value={`${forecast.profitP10}/${forecast.profitP50}/${forecast.profitP90}`} />
        <StatRow label="Negative Risk" value={`${Math.round(forecast.probabilityNegativeProfit * 100)}%`} />
      </div>
      <div className="forecast-breakdown">
        <MetricBar label="Commission Income" value={forecast.expectedCommissionProfit} max={Math.max(1, forecast.expectedTotalProfit, forecast.expectedCommissionProfit, forecast.expectedGenericShopProfit)} suffix=" gp" tone="ember" />
        <MetricBar label="Shelf Sales" value={forecast.expectedGenericShopProfit} max={Math.max(1, forecast.expectedTotalProfit, forecast.expectedCommissionProfit, forecast.expectedGenericShopProfit)} suffix=" gp" tone="brass" />
        <MetricBar label="Repairs" value={forecast.expectedRepairMiscProfit} max={Math.max(1, forecast.expectedTotalProfit, forecast.expectedRepairMiscProfit)} suffix=" gp" tone="teal" />
      </div>
      <ForecastStatBars forecast={forecast} projects={[]} />
      <div className="completion-bars">
        {Object.entries(forecast.probabilityEachProjectCompletes).map(([projectId, chance]) => (
          <ProbabilityBar
            key={projectId}
            label={projectsById.has(projectId) ? "Commission completion" : projectId}
            value={chance}
            tone="teal"
          />
        ))}
        <ProbabilityBar label="Inventory additions likely" value={1 - forecast.probabilityInventoryDemandExceedsStock} tone="brass" />
      </div>
      <div className="recommendations">
        {forecast.recommendations.map((line) => <p key={line}>{line}</p>)}
      </div>
      <MiniList title="Expected Sales" rows={forecast.expectedItemsSold.map((row) => `${row.itemName}: ${row.expectedQuantitySold}`)} />
      <MiniList title="Expected Deficits" rows={forecast.expectedInventoryDeficitsAfterMonth.map((row) => `${row.itemName}: ${row.expectedDeficit}`)} />
      <WarningList warnings={[...draft.warnings, ...forecast.warnings]} />
      <div className="wizard-actions">
        <button className="small-button" onClick={onBack}>Back to Planning</button>
        <button className="small-button" onClick={() => setDraft((current) => ({ ...current, forecast: undefined, stage: "planning" }))}>Adjust Plan</button>
        <button className="resolve-button" onClick={onProceed}>Lock In Event Rolls</button>
      </div>
    </div>
  );
}

function RollStage({
  state,
  draft,
  setDraft,
  onBack,
  onSimulate,
}: {
  state: CampaignState;
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onBack: () => void;
  onSimulate: () => void;
}) {
  const rollBox = useRef<HTMLDivElement>(null);
  const selected = draft.projectPlans.filter((plan) => {
    const project = state.projects.find((candidate) => candidate.id === plan.projectId);
    return plan.selected && !project?.take10 && (plan.fundingStatus === "funded" || plan.fundingStatus === "buffered");
  });

  useEffect(() => {
    const firstEmpty = rollBox.current?.querySelector<HTMLInputElement>("input[data-roll-input][value='']");
    firstEmpty?.focus();
  }, [draft.stage]);

  function moveNext(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = Array.from(rollBox.current?.querySelectorAll<HTMLInputElement>("input[data-roll-input]") ?? []);
    const index = inputs.indexOf(event.currentTarget);
    if (index >= inputs.length - 1) {
      onSimulate();
      return;
    }
    inputs[index + 1]?.focus();
  }

  function updateEventRoll(actor: EventActor, roll: number | undefined) {
    setDraft((current) => ({ ...current, eventRolls: { ...current.eventRolls, [actor]: roll }, simulation: undefined }));
  }

  function updateTaarkRoll(key: keyof MonthlyResolutionDraft["taarkRolls"], roll: number | undefined) {
    setDraft((current) => ({ ...current, taarkRolls: { ...current.taarkRolls, [key]: roll }, simulation: undefined }));
  }

  function updateProjectRoll(projectId: string, roll: number | undefined) {
    setDraft((current) => ({
      ...current,
      projectRolls: current.projectRolls.map((entry) => (entry.projectId === projectId ? { ...entry, roll } : entry)),
      simulation: undefined,
    }));
  }

  function rollAll() {
    const seed = `${state.settings.randomSeed}:${state.currentMonth}:${Date.now()}`;
    setDraft((current) => ({
      ...current,
      eventRolls: Object.fromEntries(eventActors.map((actor, index) => [actor, rollDie(`${seed}:event:${actor}:${index}`)])),
      taarkRolls: {
        shopSales: rollDie(`${seed}:shop`),
        genericInventoryReplenishment: rollDie(`${seed}:inventory`),
        materialManagement: rollDie(`${seed}:materials`),
      },
      projectRolls: current.projectRolls.map((entry, index) => ({
        ...entry,
        roll: (() => {
          const plan = current.projectPlans.find((candidate) => candidate.projectId === entry.projectId);
          const project = state.projects.find((candidate) => candidate.id === entry.projectId);
          return plan?.selected && !project?.take10 && (plan.fundingStatus === "funded" || plan.fundingStatus === "buffered")
            ? rollDie(`${seed}:project:${entry.projectId}:${index}`)
            : undefined;
        })(),
      })),
      simulation: undefined,
    }));
  }

  function clearRolls() {
    setDraft((current) => ({
      ...current,
      eventRolls: {},
      taarkRolls: {},
      projectRolls: current.projectRolls.map((entry) => ({ projectId: entry.projectId })),
      simulation: undefined,
    }));
  }

  return (
    <div className="wizard-body" ref={rollBox}>
      <div className="roll-callout">
        <Dice6 className="size-5" />
        <span>Enter d20 rolls in order. Press Enter on the last field to begin event playback.</span>
      </div>
      <div className="roll-grid">
        {eventActors.map((actor) => (
          <RollField key={actor} label={actor} title={`${actor} d20 monthly event roll`} value={draft.eventRolls[actor]} onChange={(roll) => updateEventRoll(actor, roll)} onKeyDown={moveNext} />
        ))}
        <RollField label="Shop Sales" title="Taark shop sales d20" value={draft.taarkRolls.shopSales} onChange={(roll) => updateTaarkRoll("shopSales", roll)} onKeyDown={moveNext} />
        <RollField label="Inventory" title="Taark generic inventory replenishment d20" value={draft.taarkRolls.genericInventoryReplenishment} onChange={(roll) => updateTaarkRoll("genericInventoryReplenishment", roll)} onKeyDown={moveNext} />
        <RollField label="Materials" title="Taark material management d20" value={draft.taarkRolls.materialManagement} onChange={(roll) => updateTaarkRoll("materialManagement", roll)} onKeyDown={moveNext} />
        {selected.map((plan) => {
          const project = state.projects.find((candidate) => candidate.id === plan.projectId);
          const roll = draft.projectRolls.find((entry) => entry.projectId === plan.projectId)?.roll;
          return project ? (
            <RollField
              key={project.id}
              label={project.name}
              title={`${project.name} project crafting d20`}
              value={roll}
              onChange={(nextRoll) => updateProjectRoll(project.id, nextRoll)}
              onKeyDown={moveNext}
            />
          ) : null;
        })}
      </div>
      <div className="wizard-actions">
        <button className="small-button" onClick={onBack}>Back to Forecast</button>
        <button className="small-button" onClick={rollAll}>Roll All Randomly</button>
        <button className="small-button" onClick={clearRolls}>Clear All Rolls</button>
        <button className="resolve-button" onClick={onSimulate}>Simulate Month</button>
      </div>
    </div>
  );
}

function PlaybackStage({
  draft,
  setDraft,
  onReport,
}: {
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onReport: () => void;
}) {
  const simulation = draft.simulation;
  if (!simulation) return null;
  const card = simulation.cards[draft.playback.cardIndex] ?? simulation.cards[0];
  const lastIndex = simulation.cards.length - 1;

  function setPlayback(update: Partial<MonthlyResolutionDraft["playback"]>) {
    setDraft((current) => ({ ...current, playback: { ...current.playback, ...update } }));
  }

  return (
    <div className="wizard-body playback-body">
      <div className="playback-grid">
        <article className="resolution-card">
          <small>{card.actorOrSystem}{card.roll ? ` | d20 ${card.roll}` : ""}</small>
          <h3>{card.title}</h3>
          {card.subtitle && <span>{card.subtitle}</span>}
          <p>{card.flavorText}</p>
          <strong>{card.mechanicalEffectText}</strong>
          <em>{draft.playback.cardIndex + 1}/{simulation.cards.length}</em>
        </article>
        <LiveOutcomeBars draft={draft} />
      </div>
      <div className="playback-controls">
        <button className="small-button" disabled={draft.playback.cardIndex === 0} onClick={() => setPlayback({ cardIndex: Math.max(0, draft.playback.cardIndex - 1) })}>Previous</button>
        <button className="small-button" disabled={draft.playback.cardIndex >= lastIndex} onClick={() => setPlayback({ cardIndex: Math.min(lastIndex, draft.playback.cardIndex + 1) })}>Next</button>
        <button className="small-button" onClick={() => setPlayback({ autoplay: !draft.playback.autoplay })}>{draft.playback.autoplay ? "Pause" : "Autoplay"}</button>
        <select value={draft.playback.speed} onChange={(event) => setPlayback({ speed: event.target.value as MonthlyResolutionDraft["playback"]["speed"] })}>
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>
      <div className="wizard-actions">
        <button className="small-button" onClick={() => setPlayback({ cardIndex: 0, autoplay: false })}>Replay Month</button>
        <button className="resolve-button" onClick={onReport}>Skip to Report</button>
      </div>
    </div>
  );
}

function LedgerStage({
  draft,
  setDraft,
  onApply,
  onPlanning,
  onDiscard,
}: {
  draft: MonthlyResolutionDraft;
  setDraft: (value: MonthlyResolutionDraft | ((current: MonthlyResolutionDraft) => MonthlyResolutionDraft)) => void;
  onApply: () => void;
  onPlanning: () => void;
  onDiscard: () => void;
}) {
  const simulation = draft.simulation;
  if (!simulation) return null;
  const report = simulation.report;
  const markdown = monthlyReportMarkdown(simulation);
  const reportFileName = `${simulation.monthLabel.toLowerCase().replace(/\s+/g, "-")}-report.md`;

  function exportReport() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = reportFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="wizard-body ledger-body">
      <div className="summary-strip">
        <StatRow label="Net" value={`${report.totalNetProfit.toLocaleString()} gp`} />
        <StatRow label="True Shop" value={`${report.trueShopValue.toLocaleString()} gp`} />
        <StatRow label="Perfectionism" value={`${report.perfectionismWaste.toLocaleString()} gp`} />
        <StatRow label="Rep" value={`${report.startingReputation} -> ${report.endingReputation}`} />
      </div>
      <MiniList title="Profit Explanation" rows={report.ledgerSummaryLines} />
      <MiniList title="Projects" rows={report.projectReports.map((project) => `${project.name}: ${project.hoursAfter}/${project.requiredHours}h, craft ${project.craftingTotal} vs DC ${project.craftDc}, ${project.quality}, ${project.completedThisMonth ? "complete" : "open"}`)} />
      <MiniList title="Materials" rows={(Object.keys(report.materialsBefore) as MaterialName[]).map((material) => `${material}: ${report.materialsBefore[material].lbs} lbs -> ${report.materialsAfter[material].lbs} lbs`)} />
      <MiniList title="Inventory" rows={[...report.itemsProduced.map((item) => `Produced ${item.quantity} ${item.itemName}`), ...report.itemsSold.map((item) => `Sold ${item.quantity} ${item.itemName} (${item.gp} gp)`), ...report.targetStockDeficitsRemaining.map((item) => `${item.itemName} deficit ${item.deficit}`)]} />
      <MiniList title="Event Log" rows={report.eventLog} />
      <div className="wizard-actions">
        <button className="resolve-button" onClick={onApply}>Apply Month to Forge</button>
        <button className="small-button" onClick={onPlanning}>Back to Planning</button>
        <button className="small-button" onClick={onDiscard}>Discard Result</button>
        <button className="small-button" onClick={exportReport}>Export Report</button>
        <button className="small-button" onClick={() => navigator.clipboard?.writeText(markdown)}>Copy Markdown</button>
        <button className="small-button" onClick={() => setDraft((current) => ({ ...current, stage: "playback" }))}>Replay Month</button>
      </div>
    </div>
  );
}

function RollField({
  label,
  title,
  value,
  onChange,
  onKeyDown,
}: {
  label: string;
  title: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const invalid = value !== undefined && (value < 1 || value > 20);
  return (
    <label className={`roll-field ${!value || invalid ? "missing" : ""}`} title={title}>
      {label}
      <input
        data-roll-input
        type="number"
        min="1"
        max="20"
        value={value ?? ""}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
      />
    </label>
  );
}

function AllocationSlider({
  label,
  value,
  max,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
  onChange: (value: number) => void;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <label className={`allocation-slider tone-${tone}`}>
      <span>
        <strong>{label}</strong>
        <em>{value}h</em>
      </span>
      <input type="range" min="0" max={max} step="5" value={Math.min(max, value)} onChange={(event) => onChange(Number(event.target.value))} />
      <i style={{ width: `${percent}%` }} />
    </label>
  );
}

function MetricBar({
  label,
  value,
  max,
  suffix = "",
  tone = "brass",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  tone?: string;
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className={`metric-bar tone-${tone}`}>
      <span>
        <strong>{label}</strong>
        <em>{value.toLocaleString()}{suffix}</em>
      </span>
      <div>
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ProbabilityBar({ label, value, tone = "brass" }: { label: string; value: number; tone?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={`probability-bar tone-${tone}`}>
      <span>
        <strong>{label}</strong>
        <em>{percent}%</em>
      </span>
      <div>
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ForecastStatBars({
  forecast,
  projects,
  compact = false,
}: {
  forecast: NonNullable<MonthlyResolutionDraft["forecast"]>;
  projects: ForgeProject[];
  compact?: boolean;
}) {
  const averageCompletion =
    Object.values(forecast.probabilityEachProjectCompletes).reduce((total, value) => total + value, 0) /
    Math.max(1, Object.values(forecast.probabilityEachProjectCompletes).length);

  return (
    <div className={`forecast-bars ${compact ? "compact" : ""}`}>
      <ProbabilityBar label="Commission completion" value={averageCompletion} tone="teal" />
      <ProbabilityBar label="Excellent craft result" value={Math.max(0, ...Object.values(forecast.probabilityEachProjectExcellentOrBetter))} tone="ember" />
      <ProbabilityBar label="Material shortage risk" value={forecast.probabilityAnyMaterialShortage} tone="violet" />
      <ProbabilityBar label="Demand over stock" value={forecast.probabilityInventoryDemandExceedsStock} tone="brass" />
      {!compact && projects.map((project) => (
        <ProbabilityBar
          key={project.id}
          label={project.name}
          value={forecast.probabilityEachProjectCompletes[project.id] ?? 0}
          tone="teal"
        />
      ))}
    </div>
  );
}

function CommissionCompletionEstimate({
  forecast,
  projects,
}: {
  forecast: NonNullable<MonthlyResolutionDraft["forecast"]>;
  projects: ForgeProject[];
}) {
  const rows = projects.filter((project) => forecast.probabilityEachProjectCompletes[project.id] !== undefined);
  if (rows.length === 0) return null;
  return (
    <div className="completion-estimate">
      <strong>Commission Completion Estimate</strong>
      {rows.map((project) => (
        <ProbabilityBar key={project.id} label={project.name} value={forecast.probabilityEachProjectCompletes[project.id] ?? 0} tone="teal" />
      ))}
    </div>
  );
}

function LiveOutcomeBars({ draft }: { draft: MonthlyResolutionDraft }) {
  const simulation = draft.simulation;
  if (!simulation) return null;
  const progress = (draft.playback.cardIndex + 1) / Math.max(1, simulation.cards.length);
  const forecastNet = simulation.forecast.expectedTotalProfit;
  const resolvedNet = Math.round(forecastNet + (simulation.report.totalNetProfit - forecastNet) * progress);
  const maxIncome = Math.max(1, Math.abs(forecastNet), Math.abs(simulation.report.totalNetProfit), simulation.report.genericShopProfit);
  const completionChance =
    simulation.report.projectReports.filter((project) => project.completedThisMonth).length / Math.max(1, simulation.report.projectReports.length);
  const inventoryAdds = Math.min(1, simulation.report.itemsProduced.reduce((total, item) => total + item.quantity, 0) / 4);

  return (
    <aside className="live-outcome-bars">
      <MetricBar label="Income Projection" value={resolvedNet} max={maxIncome} suffix=" gp" tone="brass" />
      <MetricBar label="Commission Profit" value={Math.round(simulation.report.controlledRecognizedCommissionProfit * progress)} max={maxIncome} suffix=" gp" tone="ember" />
      <ProbabilityBar label="Commissions Resolved" value={completionChance * progress} tone="teal" />
      <ProbabilityBar label="Inventory Additions" value={inventoryAdds * progress} tone="brass" />
      <ProbabilityBar label="Month Revealed" value={progress} tone="violet" />
    </aside>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  const unique = Array.from(new Set(warnings)).filter(Boolean);
  if (unique.length === 0) return null;
  return (
    <div className="warning-list">
      {unique.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}

function MiniList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="mini-report">
      <strong>{title}</strong>
      {rows.length === 0 ? <span>None</span> : rows.slice(0, 8).map((row) => <span key={row}>{row}</span>)}
    </div>
  );
}

function monthlyReportMarkdown(simulation: MonthlyResolutionSimulation) {
  const report = simulation.report;
  return [
    `# ${simulation.monthLabel} Forge Report`,
    "",
    `Net profit: ${report.totalNetProfit.toLocaleString()} gp`,
    `Commission/project value: ${report.grossCommissionProjectValue.toLocaleString()} gp`,
    `True commission profit before Perfectionism: ${report.controlledRecognizedCommissionProfit.toLocaleString()} gp`,
    `True shop value: ${report.trueShopValue.toLocaleString()} gp`,
    `Repair/misc profit: ${report.repairMiscProfit.toLocaleString()} gp`,
    `Generic shop costs: ${report.genericShopCosts.toLocaleString()} gp`,
    `Taark's Perfectionism: ${report.perfectionismWaste.toLocaleString()} gp`,
    "",
    "## Profit Explanation",
    ...report.ledgerSummaryLines.map((line) => `- ${line}`),
    "",
    "## Hours",
    `Available: ${report.totalAvailableHours}h`,
    `Projects: ${report.commissionProjectHours}h`,
    `Inventory: ${report.genericInventoryHours}h`,
    `Repairs: ${report.repairWalkInHours}h`,
    `Jordy: ${report.jordyTrainingHours}h`,
    "",
    "## Projects",
    ...report.projectReports.map((project) => `- ${project.name}: ${project.hoursAfter}/${project.requiredHours}h, craft ${project.craftingTotal} vs DC ${project.craftDc}, ${project.quality}, ${project.completedThisMonth ? "completed" : "in progress"}`),
    "",
    "## Materials",
    ...(Object.keys(report.materialsBefore) as MaterialName[]).map((material) => `- ${material}: ${report.materialsBefore[material].lbs} lbs -> ${report.materialsAfter[material].lbs} lbs`),
    "",
    "## Event Log",
    ...report.eventLog.map((line) => `- ${line}`),
  ].join("\n");
}

function WorkQueue({
  state,
  projects,
  onUpdateProject,
}: {
  state: CampaignState;
  projects: ForgeProject[];
  onUpdateProject: (id: string, update: Partial<Pick<ForgeProject, "client" | "trueContractValue" | "requiredHours" | "hoursInvested" | "craftDc" | "priority" | "notes" | "item" | "take10" | "resolutionMode" | "hoursOverride" | "craftDcOverride" | "marketPriceOverrideGp" | "rawMaterialCostOverrideGp">>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section id="orders" className="ornate-panel work-queue">
      <PanelTitle icon={ScrollText} title={`Current Work Queue (${projects.length} active)`} />
      {projects.map((project, index) => {
        const requirements = getProjectRequirements(project, state);
        const stats = deriveCraftingStats(project.item, state.profile);
        const progress = Math.min(100, Math.round((project.hoursInvested / requirements.hours) * 100));
        const remaining = Math.max(0, requirements.hours - project.hoursInvested);
        const editing = editingId === project.id;
        return (
          <article key={project.id} className={`queue-row ${editing ? "editing" : ""}`} onClick={() => setEditingId(project.id)}>
            <span className="queue-index">{index + 1}</span>
            <div className="item-emblem">
              {project.item.category === "weaponsmithing" ? <Swords className="size-6" /> : <Shield className="size-6" />}
            </div>
            <div className="queue-copy">
              <strong>{project.item.name}</strong>
              <span>for {project.client ?? "the shop"}</span>
              <div className="progress-line">
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>Progress: {progress}% | DC {requirements.dc} | {remaining}h remaining</small>
              <small>{qualityGoalLabel(stats.qualityGoal)} | {project.take10 ? "Take 10" : "Roll"} | {stats.marketPriceGp.toLocaleString()} gp market | {stats.rawMaterialCostGp.toLocaleString()} gp raw</small>
              {editing && (
                <div className="queue-editor" onClick={(event) => event.stopPropagation()}>
                  <label>
                    Client
                    <input value={project.client ?? ""} onChange={(event) => onUpdateProject(project.id, { client: event.target.value })} />
                  </label>
                  <label>
                    Reward gp
                    <input type="number" min="0" value={project.trueContractValue} onChange={(event) => onUpdateProject(project.id, { trueContractValue: Number(event.target.value) })} />
                  </label>
                  <label>
                    Skill
                    <select value={project.item.category} onChange={(event) => {
                      const category = event.target.value as SkillKey;
                      const item = { ...project.item, category };
                      const itemType = defaultItemTypeForItem(item);
                      onUpdateProject(project.id, { item: { ...item, itemType, qualityGoal: defaultQualityGoalForItem({ ...item, itemType }) } });
                    }}>
                      {skillOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Complexity
                    <select value={project.item.complexity} onChange={(event) => onUpdateProject(project.id, { item: { ...project.item, complexity: event.target.value as Complexity } })}>
                      {complexityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Item Type
                    <select value={project.item.itemType ?? defaultItemTypeForItem(project.item)} onChange={(event) => onUpdateProject(project.id, { item: { ...project.item, itemType: event.target.value as CraftItemType } })}>
                      {itemTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Quality
                    <select value={project.item.qualityGoal ?? defaultQualityGoalForItem(project.item)} onChange={(event) => onUpdateProject(project.id, { item: { ...project.item, qualityGoal: event.target.value as CraftQualityGoal, masterwork: event.target.value !== "standard" } })}>
                      {qualityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Take 10
                    <select value={project.take10 ? "yes" : "no"} onChange={(event) => onUpdateProject(project.id, { take10: event.target.value === "yes" })}>
                      <option value="no">Roll</option>
                      <option value="yes">Take 10</option>
                    </select>
                  </label>
                  <label>
                    Hours
                    <input type="number" min="1" value={project.requiredHours} onChange={(event) => onUpdateProject(project.id, { resolutionMode: "fixedHours", requiredHours: Math.max(1, Number(event.target.value)), hoursOverride: Math.max(1, Number(event.target.value)) })} />
                  </label>
                  <label>
                    Progress
                    <input type="number" min="0" value={project.hoursInvested} onChange={(event) => onUpdateProject(project.id, { hoursInvested: Number(event.target.value) })} />
                  </label>
                  <label>
                    DC
                    <input type="number" min="1" value={project.craftDc} onChange={(event) => onUpdateProject(project.id, { resolutionMode: "fixedHours", craftDc: Math.max(1, Number(event.target.value)), craftDcOverride: Math.max(1, Number(event.target.value)) })} />
                  </label>
                  <label>
                    Priority
                    <select value={project.priority} onChange={(event) => onUpdateProject(project.id, { priority: event.target.value as ForgeProject["priority"] })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                  <label className="queue-notes">
                    Notes
                    <input value={project.notes ?? ""} onChange={(event) => onUpdateProject(project.id, { notes: event.target.value })} />
                  </label>
                  <button className="small-button" type="button" onClick={() => setEditingId(null)}>
                    Done
                  </button>
                </div>
              )}
            </div>
            <span className={`priority priority-${project.priority}`}>{project.priority}</span>
          </article>
        );
      })}
    </section>
  );
}

function ResourcesPanel({
  state,
  newCommission,
  setNewCommission,
  onAddCommission,
  onExportJson,
  onImportJson,
  onReset,
  onUpdateProfile,
  importError,
}: {
  state: CampaignState;
  newCommission: {
    client: string;
    item: string;
    rewardGp: number;
    category: SkillKey;
    complexity: Complexity;
    itemType: CraftItemType;
    qualityGoal: CraftQualityGoal;
    primaryMaterial: MaterialName;
    materialLbs: number;
    specialMaterial: "" | MaterialName;
    hoursOverride: number;
    craftDcOverride: number;
    take10: boolean;
  };
  setNewCommission: (value: {
    client: string;
    item: string;
    rewardGp: number;
    category: SkillKey;
    complexity: Complexity;
    itemType: CraftItemType;
    qualityGoal: CraftQualityGoal;
    primaryMaterial: MaterialName;
    materialLbs: number;
    specialMaterial: "" | MaterialName;
    hoursOverride: number;
    craftDcOverride: number;
    take10: boolean;
  }) => void;
  onAddCommission: () => void;
  onExportJson: () => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onUpdateProfile: (update: Partial<CampaignState["profile"]>) => void;
  importError: string;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset();
    setConfirmReset(false);
  }

  return (
    <section id="resources" className="resources-panel ornate-panel">
      <div className="campaign-tools-compact">
        <PanelTitle icon={Settings} title="Campaign Tools" />
        <button className={`danger-button ${confirmReset ? "armed" : ""}`} onClick={handleReset}>
          {confirmReset ? "Confirm Reset to Default" : "Reset Simulation"}
        </button>
        {confirmReset && <button className="small-button" onClick={() => setConfirmReset(false)}>Cancel Reset</button>}
        <div className="save-actions">
          <button className="small-button" onClick={onExportJson}>
            <Download className="size-4" />
            Save JSON
          </button>
          <label className="small-button cursor-pointer">
            <Upload className="size-4" />
            Load JSON
            <input type="file" accept="application/json" onChange={onImportJson} className="hidden" />
          </label>
        </div>
        <p className="save-note">Shared saves live in Redis online. Save JSON downloads a local backup file.</p>
        {importError && <p className="error-text">{importError}</p>}
        <div className="rules-tuning">
          <strong>Official Craft Rules</strong>
          <NumberField
            label="Perfectionism %"
            value={state.profile.perfectionismWastePct}
            onChange={(value) => onUpdateProfile({ perfectionismWastePct: Math.max(0, value) })}
          />
          <div className="rank-grid">
            {skillOptions.map((skill) => (
              <NumberField
                key={skill.value}
                label={`${skill.label} ranks`}
                value={state.profile.craftRanks[skill.value]}
                onChange={(value) =>
                  onUpdateProfile({
                    craftRanks: {
                      ...state.profile.craftRanks,
                      [skill.value]: Math.max(0, value),
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
        <AddCommissionForm
          state={state}
          newCommission={newCommission}
          setNewCommission={setNewCommission}
          onAddCommission={onAddCommission}
        />
      </div>
    </section>
  );
}

function MaterialsInventoryPanel({
  state,
  onUpdateMaterial,
}: {
  state: ReturnType<typeof useLocalCampaign>["state"];
  onUpdateMaterial: (material: MaterialName, value: number) => void;
}) {
  return (
    <section className="left-materials">
      <PanelTitle icon={Gem} title="Materials Inventory" />
      <small className="save-note">Guild auto-supplies shortages; this tracks on-hand stock and price basis.</small>
      <div className="mini-list">
        {(Object.entries(state.materials) as Array<[MaterialName, { lbs: number; gpPerLb: number }]>).map(([material, amount]) => (
          <label key={material} className="editable-row">
            <span>{material}</span>
            <input type="number" min="0" value={amount.lbs} onChange={(event) => onUpdateMaterial(material, Number(event.target.value))} />
            <em>{amount.gpPerLb} gp/lb</em>
          </label>
        ))}
      </div>
    </section>
  );
}

function ShopSummary({
  state,
  activeCount,
  completedCount,
  latestLedger,
  projectedExpenses,
}: {
  state: ReturnType<typeof useLocalCampaign>["state"];
  activeCount: number;
  completedCount: number;
  latestLedger: ReturnType<typeof useLocalCampaign>["state"]["ledger"][number] | undefined;
  projectedExpenses: number;
}) {
  return (
    <section id="ledger" className="shop-panel ornate-panel">
      <PanelTitle icon={Coins} title="Shop Summary" />
      <StatRow label="Reputation (Waterdeep)" value={`${state.profile.reputation}/20`} />
      <StatRow label="Renown" value="Respected" />
      <StatRow label="Clients" value="Noble, Watch, Guild" />
      <StatRow label="Commission Work" value={`${activeCount} active`} />
      <StatRow label="Completed Work" value={`${completedCount} total`} />
      <StatRow label="Last Net" value={latestLedger ? `${latestLedger.netProfit.toLocaleString()} gp` : "None"} />
      <StatRow label="Monthly Expenses (est.)" value={`${projectedExpenses.toLocaleString()} gp`} />
      <StatRow label="Days Until Month End" value="18" />
    </section>
  );
}

function ForgeInventoryBand({
  state,
  onUpdateInventory,
}: {
  state: ReturnType<typeof useLocalCampaign>["state"];
  onUpdateInventory: (id: string, update: { quantity?: number; target?: number }) => void;
}) {
  const deficits = state.inventory.filter((stock) => stock.quantity < stock.target);
  const productionPreview = deficits.slice(0, 4).map((stock) => {
    const requirements = deriveCraftingStats(stock.item);
    const possible = Math.floor(Math.max(0, state.labor.genericInventory) / Math.max(1, requirements.hours));
    return `${inventoryItemDisplayName(stock.item)}: need ${Math.max(0, stock.target - stock.quantity)}, about ${possible} possible`;
  });

  return (
    <section id="inventory" className="stock-band ornate-panel">
      <div className="inventory-header">
        <PanelTitle icon={Shield} title="Forge Inventory" />
        <div className="production-targets">
          <strong>Dwarvencraft Armor Targets</strong>
          <span>{productionPreview.length ? productionPreview.join(" | ") : "All target stock is filled."}</span>
        </div>
      </div>
      <div className="inventory-ledger">
        {state.inventory.map((stock) => (
          <InventoryRow key={stock.id} stock={stock} onUpdateInventory={onUpdateInventory} />
        ))}
      </div>
    </section>
  );
}

function InventoryRow({
  stock,
  onUpdateInventory,
}: {
  stock: ReturnType<typeof useLocalCampaign>["state"]["inventory"][number];
  onUpdateInventory: (id: string, update: { quantity?: number; target?: number }) => void;
}) {
  const Icon = stock.item.category === "weaponsmithing" ? Swords : stock.item.category === "armorsmithing" ? Shield : Hammer;
  const deficit = Math.max(0, stock.target - stock.quantity);
  const qualityGoal = qualityGoalLabel(stock.item.qualityGoal ?? defaultQualityGoalForItem(stock.item));

  return (
    <article className={`inventory-row ${deficit > 0 ? "needs-stock" : ""}`}>
      <Icon className="size-4" />
      <div>
        <strong>{inventoryItemDisplayName(stock.item)}</strong>
        <span>{qualityGoal} goal | {stock.item.category} | {itemRecipeSummary(stock.item)}</span>
      </div>
      <em>{itemPrimaryMaterialLabel(stock.item)}</em>
      <label>
        Qty
        <input
          aria-label={`${stock.item.name} stock`}
          type="number"
          min="0"
          value={stock.quantity}
          onChange={(event) => onUpdateInventory(stock.id, { quantity: Number(event.target.value) })}
        />
      </label>
      <label>
        Target
        <input
          aria-label={`${stock.item.name} target`}
          type="number"
          min="0"
          value={stock.target}
          onChange={(event) => onUpdateInventory(stock.id, { target: Number(event.target.value) })}
        />
      </label>
    </article>
  );
}

function InfoPopup({
  panel,
  state,
  projects,
  onClose,
}: {
  panel: InfoPanel;
  state: CampaignState;
  projects: ForgeProject[];
  onClose: () => void;
}) {
  const latestLedger = state.ledger[0];
  const rows: string[] =
    panel === "orders"
      ? projects.map((project) => `${project.name}: ${project.hoursInvested}/${getProjectRequirements(project, state).hours}h`)
      : panel === "inventory"
        ? state.inventory.slice(0, 8).map((stock) => `${stock.item.name}: ${stock.quantity}/${stock.target}`)
        : panel === "resources"
          ? (Object.entries(state.materials) as Array<[MaterialName, { lbs: number }]>).map(([material, amount]) => `${material}: ${amount.lbs} lbs`)
          : panel === "ledger" && latestLedger
            ? [`Last net: ${latestLedger.netProfit.toLocaleString()} gp`, `Shop: ${latestLedger.shopSales.toLocaleString()} gp`, `Rep delta: ${latestLedger.reputationDelta}`]
            : panel === "events"
              ? ["Events now resolve inside the monthly event popup.", "Use Monthly Resolution to enter table d20s and walk through outcomes."]
              : panel === "upgrades"
                ? [
                    `Armor: +${state.profile.skills.armorsmithing + state.profile.forgeBonus + state.profile.toolBonus}`,
                    `Weapons: +${state.profile.skills.weaponsmithing + state.profile.forgeBonus + state.profile.toolBonus}`,
                    `Blacksmithing: +${state.profile.skills.blacksmithing + state.profile.forgeBonus + state.profile.toolBonus}`,
                    `Finesmithing: +${state.profile.skills.finesmithing + state.profile.forgeBonus + state.profile.toolBonus}`,
                    `Locksmithing: +${state.profile.skills.locksmithing + state.profile.forgeBonus + state.profile.toolBonus}`,
                  ]
                : panel === "visitors"
                  ? eventActors.map((actor) => `${actor}: event roll during resolution`)
                  : [`${state.profile.name}`, state.profile.title, `Reputation ${state.profile.reputation}/${state.profile.maxReputation}`];

  return (
    <aside className="info-popup ornate-panel">
      <button className="icon-close" type="button" onClick={onClose} title="Close">
        <X className="size-4" />
      </button>
      <PanelTitle icon={Sparkles} title={panel} />
      <div className="mini-list">
        {rows.map((row) => (
          <span key={row}>{row}</span>
        ))}
      </div>
    </aside>
  );
}

function RulesSettingsOverlay({
  state,
  onUpdateProfile,
  onClose,
}: {
  state: CampaignState;
  onUpdateProfile: (update: Partial<CampaignState["profile"]>) => void;
  onClose: () => void;
}) {
  return (
    <div className="resolution-overlay">
      <section className="resolution-modal ornate-panel rules-modal">
        <div className="modal-title">
          <PanelTitle icon={Settings} title="Rules and Economy" />
          <button className="icon-close" type="button" onClick={onClose} title="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="rules-settings-grid">
          <NumberField label="Target Profit gp" value={state.profile.dmTargetProfitGp} onChange={(value) => onUpdateProfile({ dmTargetProfitGp: Math.max(0, value) })} />
          <NumberField label="Sigma gp" value={state.profile.dmTargetVolatilityGp} onChange={(value) => onUpdateProfile({ dmTargetVolatilityGp: Math.max(0, value) })} />
          <NumberField label="Perfectionism %" value={state.profile.perfectionismWastePct} onChange={(value) => onUpdateProfile({ perfectionismWastePct: Math.max(0, value) })} />
        </div>
        <div className="rules-scroll">
          <h3>Rule Set Overview</h3>
          <p>Brightaxe uses fixed complexity time in hours: very simple 8h, simple 16h, moderate 32h, complex 56h, and very complex 112h. All monthly allocation sliders spend hours, so crafting time is translated directly into the same unit the campaign dashboard uses.</p>
          <p>Quality goals are explicit. Taark defaults to Dwarvencraft for armor and shields, Masterwork for weapons, and Standard for blacksmithing, finesmithing, and locksmithing shelf goods. Project rows can override the quality goal when the DM needs an exception.</p>
          <p>Masterwork adds +4 DC and +50% time. Dwarvencraft implies Masterwork, then adds +2 DC, +25% time, and the Dwarvencraft surcharge. Special materials add their DC and time modifiers. Craft ranks can halve time up to three times, and check margin can resolve final completion when a funded commission rolls.</p>
          <p>Materials are guild-backed. Taark tracks on-hand pounds and true costs, but shortages do not block crafting. Missing materials are assumed to be supplied through guild channels and charged through the month.</p>
          <p>The ledger now starts from true value: completed commission value, shop sales, and repairs. Taark&apos;s Perfectionism is then shown as an explicit extra material/work cost for rejected, overbuilt, re-smelted, refit, or over-polished goods. Strong rolls and commission-heavy months can exceed the DM target; the target and sigma are guidance, not a hard cap.</p>
          <p>Monthly Event Mod is a percentage modifier to the whole month&apos;s available forge hours. Jordy&apos;s training slider is capped at 240 hours, roughly 8 hours per day across a 30-day month.</p>
        </div>
      </section>
    </div>
  );
}

function SyncStatusBanner({
  status,
  message,
  revision,
  hasConflict,
  onReload,
  onOverwrite,
}: {
  status: ReturnType<typeof useLocalCampaign>["syncStatus"];
  message: string;
  revision: number | null;
  hasConflict: boolean;
  onReload: () => void;
  onOverwrite: () => void;
}) {
  return (
    <aside className={`sync-banner sync-${status}`}>
      <span>{status === "online" && revision ? `Shared r${revision}` : status}</span>
      <strong>{message}</strong>
      {hasConflict && (
        <div>
          <button className="small-button" type="button" onClick={onReload}>
            Reload
          </button>
          <button className="small-button" type="button" onClick={onOverwrite}>
            Overwrite
          </button>
        </div>
      )}
    </aside>
  );
}

function AddCommissionForm({
  state,
  newCommission,
  setNewCommission,
  onAddCommission,
}: {
  state: CampaignState;
  newCommission: {
    client: string;
    item: string;
    rewardGp: number;
    category: SkillKey;
    complexity: Complexity;
    itemType: CraftItemType;
    qualityGoal: CraftQualityGoal;
    primaryMaterial: MaterialName;
    materialLbs: number;
    specialMaterial: "" | MaterialName;
    hoursOverride: number;
    craftDcOverride: number;
    take10: boolean;
  };
  setNewCommission: (value: typeof newCommission) => void;
  onAddCommission: () => void;
}) {
  const previewItem: ForgeItem = {
    name: newCommission.item || "New commission",
    category: newCommission.category,
    itemType: newCommission.itemType,
    complexity: newCommission.complexity,
    basePriceGp: newCommission.rewardGp,
    masterwork: newCommission.qualityGoal !== "standard",
    qualityGoal: newCommission.qualityGoal,
    specialMaterial: newCommission.specialMaterial || undefined,
    materialRecipe: { [newCommission.primaryMaterial]: Math.max(0, newCommission.materialLbs) },
  };
  const preview = deriveCraftingStats(previewItem, state.profile);

  function setCategory(category: SkillKey) {
    const item = { name: newCommission.item || "New commission", category };
    const itemType = defaultItemTypeForItem(item);
    setNewCommission({ ...newCommission, category, itemType, qualityGoal: defaultQualityGoalForItem({ ...item, itemType, masterwork: category !== "blacksmithing" }) });
  }

  return (
    <div className="add-form">
      <input placeholder="Client" value={newCommission.client} onChange={(event) => setNewCommission({ ...newCommission, client: event.target.value })} />
      <input placeholder="Item" value={newCommission.item} onChange={(event) => setNewCommission({ ...newCommission, item: event.target.value })} />
      <NumberField label="Reward gp" value={newCommission.rewardGp} onChange={(value) => setNewCommission({ ...newCommission, rewardGp: value })} />
      <label>
        Skill
        <select value={newCommission.category} onChange={(event) => setCategory(event.target.value as SkillKey)}>
          {skillOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Complexity
        <select value={newCommission.complexity} onChange={(event) => setNewCommission({ ...newCommission, complexity: event.target.value as Complexity })}>
          {complexityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Type
        <select value={newCommission.itemType} onChange={(event) => setNewCommission({ ...newCommission, itemType: event.target.value as CraftItemType })}>
          {itemTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Quality
        <select value={newCommission.qualityGoal} onChange={(event) => setNewCommission({ ...newCommission, qualityGoal: event.target.value as CraftQualityGoal })}>
          {qualityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        Material
        <select value={newCommission.primaryMaterial} onChange={(event) => setNewCommission({ ...newCommission, primaryMaterial: event.target.value as MaterialName })}>
          {["Iron", "Steel", "Cold Iron", "Alchemical Silver", "Mithril", "Adamantine", "Silver", "Gold", "Platinum", "Brass", "Bronze"].map((material) => <option key={material} value={material}>{material}</option>)}
        </select>
      </label>
      <NumberField label="Material lbs" value={newCommission.materialLbs} onChange={(value) => setNewCommission({ ...newCommission, materialLbs: value })} />
      <label>
        Special
        <select value={newCommission.specialMaterial} onChange={(event) => setNewCommission({ ...newCommission, specialMaterial: event.target.value as "" | MaterialName })}>
          <option value="">None</option>
          {["Cold Iron", "Alchemical Silver", "Mithril", "Adamantine", "Silver"].map((material) => <option key={material} value={material}>{material}</option>)}
        </select>
      </label>
      <NumberField label="Hours Override" value={newCommission.hoursOverride} onChange={(value) => setNewCommission({ ...newCommission, hoursOverride: value })} />
      <NumberField label="DC Override" value={newCommission.craftDcOverride} onChange={(value) => setNewCommission({ ...newCommission, craftDcOverride: value })} />
      <label>
        Check
        <select value={newCommission.take10 ? "take10" : "roll"} onChange={(event) => setNewCommission({ ...newCommission, take10: event.target.value === "take10" })}>
          <option value="roll">Roll</option>
          <option value="take10">Take 10</option>
        </select>
      </label>
      <small className="derived-preview">Rules: {preview.hours}h, DC {preview.dc}, {preview.marketPriceGp.toLocaleString()} gp market, {preview.rawMaterialCostGp.toLocaleString()} gp raw</small>
      <button className="brass-button" onClick={onAddCommission}>
        <Plus className="size-4" />
        Add Commission
      </button>
    </div>
  );
}

function PanelTitle({ icon: Icon, title }: { icon: typeof Hammer; title: string }) {
  return (
    <div className="panel-title">
      <Icon className="size-4" />
      <h2>{title}</h2>
    </div>
  );
}

function OrnateBox({ children }: { children: ReactNode }) {
  return <div className="ornate-box">{children}</div>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="number-field">
      {label}
      <input type="number" min="0" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
