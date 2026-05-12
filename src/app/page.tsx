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
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  allocateCommissionProjectHours,
  deriveCraftingStats,
  eventActors,
  forecastMonthlyPlan,
  getProjectRequirements,
  inventoryItemDisplayName,
  itemPrimaryMaterialLabel,
  itemRecipeSummary,
  materialRowsFromRecipe,
  resolveMonthlyDraft,
  rollDie,
  validateResolutionPlan,
} from "@/lib/forge-engine";
import type { CampaignState, EventActor, ForgeProject, MaterialName, MonthlyResolutionDraft, MonthlyResolutionSimulation } from "@/lib/forge-types";
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
  const [musicEnabled, setMusicEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [newCommission, setNewCommission] = useState({
    client: "",
    item: "",
    rewardGp: 1000,
    hours: 80,
    craftDc: 22,
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

  function updateProject(id: string, update: Partial<Pick<ForgeProject, "client" | "trueContractValue" | "requiredHours" | "hoursInvested" | "craftDc" | "priority" | "notes">>) {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) => {
        if (project.id !== id) return project;
        const trueContractValue = update.trueContractValue ?? project.trueContractValue;
        const materialCost = project.materialCost;
        return {
          ...project,
          ...update,
          trueContractValue,
          listedItemValue: trueContractValue,
          laborFee: Math.max(0, trueContractValue - materialCost),
          trueMargin: Math.max(0, trueContractValue - materialCost - project.specialExpenses),
          hoursInvested: Math.min(Math.max(0, update.hoursInvested ?? project.hoursInvested), update.requiredHours ?? project.requiredHours),
        };
      }),
    }));
    setDraft((current) => ({ ...current, forecast: undefined, simulation: undefined }));
  }

  function addCommission() {
    if (!newCommission.client.trim() || !newCommission.item.trim()) return;
    const id = `custom-${Date.now()}`;
    const item = {
      name: newCommission.item.trim(),
      category: "armorsmithing" as const,
      complexity: "complex" as const,
      basePriceGp: newCommission.rewardGp,
      masterwork: true,
      materialRecipe: { Steel: 20 },
    };
    const stats = deriveCraftingStats(item);

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
          itemType: item.name,
          priority: "medium",
          status: "queued",
          trueContractValue: newCommission.rewardGp,
          listedItemValue: item.basePriceGp,
          materialCost: 20 * (current.materials.Steel?.gpPerLb ?? 1),
          specialExpenses: 0,
          laborFee: Math.max(0, newCommission.rewardGp - 20 * (current.materials.Steel?.gpPerLb ?? 1)),
          trueMargin: Math.max(0, newCommission.rewardGp - 20 * (current.materials.Steel?.gpPerLb ?? 1)),
          requiredHours: newCommission.hours,
          hoursInvested: 0,
          craftDc: newCommission.craftDc || stats.dc,
          prestige: 1,
          reputationEffectOnCompletion: 1,
          materials: materialRowsFromRecipe(item.materialRecipe),
          notes: "Custom table commission.",
          resolutionMode: "fixedHours",
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
    setNewCommission({ client: "", item: "", rewardGp: 1000, hours: 80, craftDc: 22 });
    setDraft((current) => ({
      ...current,
      projectPlans: [
        ...current.projectPlans,
        { projectId: id, selected: false, allocatedHours: 0, nominalHours: newCommission.hours, protectedHours: newCommission.hours, bufferHours: 0, fundingStatus: "unfunded" },
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
          <ForgeStage />

          <div className="center-panels">
            <WorkQueue projects={activeProjects} onUpdateProject={updateProject} />
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
          newCommission={newCommission}
          setNewCommission={setNewCommission}
          onAddCommission={addCommission}
          onExportJson={exportJson}
          onImportJson={handleImport}
          onReset={reset}
          importError={importError}
        />
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

function ForgeStage() {
  return (
    <section className="forge-art-panel">
      <video className="forge-art" autoPlay loop muted playsInline poster="/brightaxe-forge-backdrop.png" aria-label="Animated view of the Brightaxe forge">
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
        <Settings className="size-5" />
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
        totalAvailableHours: draft.hourInputs.baseHours + draft.hourInputs.ringOfSustenanceBonus + draft.hourInputs.workaholicBonus + draft.hourInputs.eventHourModifier,
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
  const totalAvailable =
    draft.hourInputs.baseHours + draft.hourInputs.ringOfSustenanceBonus + draft.hourInputs.workaholicBonus + draft.hourInputs.eventHourModifier;
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
          totalAvailableHours:
            hourInputs.baseHours + hourInputs.ringOfSustenanceBonus + hourInputs.workaholicBonus + hourInputs.eventHourModifier,
        },
        simulation: undefined,
      };
    });
  }

  function updateAllocation(key: keyof MonthlyResolutionDraft["allocation"], value: number) {
    const maxHours = Math.max(0, totalAvailable);
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
        allocation[candidate] = Math.max(0, share);
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
        <NumberField label="Event Mod" value={draft.hourInputs.eventHourModifier} onChange={(value) => updateHours("eventHourModifier", value)} />
      </div>
      <div className="slider-stack">
        {allocationControls.map((control) => (
          <AllocationSlider
            key={control.key}
            label={control.label}
            value={draft.allocation[control.key]}
            max={totalAvailable}
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
            nominalHours: Math.max(0, getProjectRequirements(project).hours - project.hoursInvested),
            protectedHours: Math.max(0, getProjectRequirements(project).hours - project.hoursInvested),
            bufferHours: 0,
            fundingStatus: "unfunded" as const,
          };
          const requirements = getProjectRequirements(project);
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
  const selected = draft.projectPlans.filter((plan) => plan.selected);

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
        roll: current.projectPlans.find((plan) => plan.projectId === entry.projectId)?.selected ? rollDie(`${seed}:project:${entry.projectId}:${index}`) : undefined,
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
        <StatRow label="Shop" value={`${report.genericShopProfit.toLocaleString()} gp`} />
        <StatRow label="Rep" value={`${report.startingReputation} -> ${report.endingReputation}`} />
      </div>
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
    `Recognized commission profit: ${report.controlledRecognizedCommissionProfit.toLocaleString()} gp`,
    `Shop profit: ${report.genericShopProfit.toLocaleString()} gp`,
    `Repair/misc profit: ${report.repairMiscProfit.toLocaleString()} gp`,
    `Generic shop costs: ${report.genericShopCosts.toLocaleString()} gp`,
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
  projects,
  onUpdateProject,
}: {
  projects: ForgeProject[];
  onUpdateProject: (id: string, update: Partial<Pick<ForgeProject, "client" | "trueContractValue" | "requiredHours" | "hoursInvested" | "craftDc" | "priority" | "notes">>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section id="orders" className="ornate-panel work-queue">
      <PanelTitle icon={ScrollText} title={`Current Work Queue (${projects.length}/3)`} />
      {projects.map((project, index) => {
        const requirements = getProjectRequirements(project);
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
                    Hours
                    <input type="number" min="1" value={project.requiredHours} onChange={(event) => onUpdateProject(project.id, { requiredHours: Math.max(1, Number(event.target.value)) })} />
                  </label>
                  <label>
                    Progress
                    <input type="number" min="0" value={project.hoursInvested} onChange={(event) => onUpdateProject(project.id, { hoursInvested: Number(event.target.value) })} />
                  </label>
                  <label>
                    DC
                    <input type="number" min="1" value={project.craftDc} onChange={(event) => onUpdateProject(project.id, { craftDc: Math.max(1, Number(event.target.value)) })} />
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
  newCommission,
  setNewCommission,
  onAddCommission,
  onExportJson,
  onImportJson,
  onReset,
  importError,
}: {
  newCommission: { client: string; item: string; rewardGp: number; hours: number; craftDc: number };
  setNewCommission: (value: { client: string; item: string; rewardGp: number; hours: number; craftDc: number }) => void;
  onAddCommission: () => void;
  onExportJson: () => void;
  onImportJson: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
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
        <AddCommissionForm
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
      <div className="mini-list">
        {(Object.entries(state.materials) as Array<[MaterialName, { lbs: number; gpPerLb: number }]>).map(([material, amount]) => (
          <label key={material} className="editable-row">
            <span>{material}</span>
            <input type="number" min="0" value={amount.lbs} onChange={(event) => onUpdateMaterial(material, Number(event.target.value))} />
            <em>lbs</em>
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
  const Icon = stock.item.category === "weaponsmithing" ? Swords : Shield;
  const deficit = Math.max(0, stock.target - stock.quantity);
  const qualityGoal = stock.item.category === "weaponsmithing" ? "Masterwork" : "Dwarvencraft";

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
      ? projects.map((project) => `${project.name}: ${project.hoursInvested}/${getProjectRequirements(project).hours}h`)
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
  newCommission,
  setNewCommission,
  onAddCommission,
}: {
  newCommission: { client: string; item: string; rewardGp: number; hours: number; craftDc: number };
  setNewCommission: (value: { client: string; item: string; rewardGp: number; hours: number; craftDc: number }) => void;
  onAddCommission: () => void;
}) {
  return (
    <div className="add-form">
      <input placeholder="Client" value={newCommission.client} onChange={(event) => setNewCommission({ ...newCommission, client: event.target.value })} />
      <input placeholder="Item" value={newCommission.item} onChange={(event) => setNewCommission({ ...newCommission, item: event.target.value })} />
      <NumberField label="Reward gp" value={newCommission.rewardGp} onChange={(value) => setNewCommission({ ...newCommission, rewardGp: value })} />
      <NumberField label="Hours" value={newCommission.hours} onChange={(value) => setNewCommission({ ...newCommission, hours: value })} />
      <NumberField label="Craft DC" value={newCommission.craftDc} onChange={(value) => setNewCommission({ ...newCommission, craftDc: value })} />
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
