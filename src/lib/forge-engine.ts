import type {
  CampaignState,
  Complexity,
  CraftQuality,
  EventActor,
  EventModifier,
  EventSource,
  ForecastResult,
  ForecastBreakdown,
  ForgeItem,
  ForgeProject,
  InventoryItem,
  LaborAllocation,
  LegacyCampaignState,
  MaterialInventory,
  MaterialName,
  MonthlyResolutionDraft,
  MonthlyResolutionReport,
  MonthlyResolutionSimulation,
  MonthlyEvent,
  Outcome,
  Priority,
  ProjectEconomicMode,
  ProjectFinancials,
  ProjectMaterial,
  ProjectTemplateName,
  ResolutionCard,
  ResolutionResult,
} from "./forge-types";

export const complexityHours: Record<Complexity, number> = {
  "very-simple": 8,
  simple: 16,
  moderate: 32,
  complex: 56,
  "very-complex": 112,
};

export const complexityDcModifier: Record<Complexity, number> = {
  "very-simple": 0,
  simple: 2,
  moderate: 4,
  complex: 8,
  "very-complex": 10,
};

export const specialMaterialDc: Partial<Record<MaterialName, number>> = {
  Adamantine: 6,
  Mithril: 4,
  Silver: 2,
};

export const defaultMaterialCosts: Record<MaterialName, number> = {
  Iron: 0.1,
  Steel: 1,
  Mithril: 250,
  Adamantine: 300,
  Silver: 5,
  Gold: 50,
};

const eventSources: EventSource[] = [
  "Valthen",
  "Tyrande",
  "Stigandur",
  "Riff",
  "Galanthir",
  "Guild",
  "City",
  "Jordy",
];

const eventDeck: Record<EventSource, Array<Omit<MonthlyEvent, "id" | "source" | "locked">>> = {
  Valthen: [
    {
      title: "Quiet Extra Hands",
      flavorText: "Valthen spends late evenings sorting fittings and quenching small repairs.",
      modifier: { laborHours: 42 },
      visibleAtTable: true,
    },
    {
      title: "Steady Hammer Rhythm",
      flavorText: "An extra hammer finds Taark's tempo, and the shop moves faster than expected.",
      modifier: { laborHours: 58 },
      visibleAtTable: true,
    },
    {
      title: "Careful Repair Week",
      flavorText: "Dock Ward shields and buckles leave the benches cleaner than they arrived.",
      modifier: { laborHours: 26, shopSalesGp: 120 },
      visibleAtTable: true,
    },
  ],
  Tyrande: [
    {
      title: "A Noble Request With Too Many Names",
      flavorText: "Tyrande arrives with a promising introduction and an impossible timetable.",
      modifier: { laborHours: -18, reputation: 1, prestige: 1 },
      visibleAtTable: true,
    },
    {
      title: "Star Elf Patronage",
      flavorText: "A tasteful salon whispers about Taark's star-bright rivets and unbreakable straps.",
      modifier: { shopSalesGp: 360, reputation: 1 },
      visibleAtTable: true,
    },
    {
      title: "Bizarre Opportunity",
      flavorText: "A sealed coffer, three courtiers, and one strange sketch of ceremonial armor appear.",
      modifier: { laborHours: -10, shopSalesGp: 220, prestige: 2 },
      visibleAtTable: false,
    },
  ],
  Stigandur: [
    {
      title: "Dockside Toasts",
      flavorText: "The Mermaid keeps singing until dawn; Taark loses a morning but gains a dozen customers.",
      modifier: { laborHours: -24, shopSalesGp: 180 },
      visibleAtTable: true,
    },
    {
      title: "Friendly Contest",
      flavorText: "A lifting match outside the tavern becomes a story about Brightaxe-made buckles.",
      modifier: { laborHours: -12, reputation: 1 },
      visibleAtTable: true,
    },
    {
      title: "Broken Benches, Paid Repairs",
      flavorText: "Stigandur's celebration is expensive for the tavern and profitable for the forge.",
      modifier: { laborHours: -34, shopSalesGp: 300 },
      visibleAtTable: true,
    },
  ],
  Riff: [
    {
      title: "Useful Rumors",
      flavorText: "Riff hears where a caravan's spare ingots can be bought before guild markup.",
      modifier: { materialDiscountPct: 12, shopSalesGp: 80 },
      visibleAtTable: false,
    },
    {
      title: "Odd Buyer",
      flavorText: "A masked collector wants a practical shield with a theatrical story.",
      modifier: { shopSalesGp: 260, prestige: 1 },
      visibleAtTable: true,
    },
    {
      title: "Procurement Shortcut",
      flavorText: "A crate arrives labeled as cookware and somehow contains exactly the right rivets.",
      modifier: { laborHours: 18, materialDiscountPct: 8 },
      visibleAtTable: false,
    },
  ],
  Galanthir: [
    {
      title: "Songs Above The Anvil",
      flavorText: "Galanthir's audience spills downstairs after the second encore.",
      modifier: { shopSalesGp: 440, reputation: 1 },
      visibleAtTable: true,
    },
    {
      title: "Noble Audience",
      flavorText: "A visiting house hears Taark's name wrapped in a verse too catchy to ignore.",
      modifier: { shopSalesGp: 520, prestige: 1 },
      visibleAtTable: true,
    },
    {
      title: "Good Room, Better Mood",
      flavorText: "Music softens the forge's hard edges, and customers linger long enough to buy.",
      modifier: { shopSalesGp: 320 },
      visibleAtTable: true,
    },
  ],
  Guild: [
    {
      title: "Splendid Order Referral",
      flavorText: "The guild sends a careful client who wants proof more than promises.",
      modifier: { shopSalesGp: 300, reputation: 1 },
      visibleAtTable: false,
    },
    {
      title: "Inspection Week",
      flavorText: "A guild inspection slows the benches but leaves Taark's standing intact.",
      modifier: { laborHours: -16, prestige: 1 },
      visibleAtTable: false,
    },
    {
      title: "Noble Tournament Notice",
      flavorText: "Armorers across Waterdeep prepare for display pieces and emergency repairs.",
      modifier: { shopSalesGp: 480 },
      visibleAtTable: true,
    },
  ],
  City: [
    {
      title: "Dock Ward Rain",
      flavorText: "Rain keeps sailors indoors and the Mermaid loud; shield straps sell well.",
      modifier: { shopSalesGp: 160 },
      visibleAtTable: true,
    },
    {
      title: "Trade Surge",
      flavorText: "Loaded wagons and anxious guards make good armor feel like good sense.",
      modifier: { shopSalesGp: 360, materialDiscountPct: 5 },
      visibleAtTable: true,
    },
    {
      title: "Coal Shortage",
      flavorText: "Fuel costs climb until every hot hour feels a little dearer.",
      modifier: { laborHours: -20, shopSalesGp: -120 },
      visibleAtTable: false,
    },
  ],
  Jordy: [
    {
      title: "Learning Breakthrough",
      flavorText: "Jordy finally hears the metal before Taark has to explain it.",
      modifier: { laborHours: 22 },
      visibleAtTable: true,
    },
    {
      title: "Enthusiastic Mistake",
      flavorText: "A tray of fittings is sorted with confidence, then sorted again correctly.",
      modifier: { laborHours: -14 },
      visibleAtTable: true,
    },
    {
      title: "Bright-Eyed Assistance",
      flavorText: "Jordy sweeps, fetches, bellows, and asks only six dangerous questions.",
      modifier: { laborHours: 12, reputation: 1 },
      visibleAtTable: true,
    },
  ],
};

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(seed: string, sides = 20): number {
  return Math.floor(makeRng(seed)() * sides) + 1;
}

export function deriveCraftingStats(item: ForgeItem): { hours: number; dc: number } {
  const materialMultiplier = item.specialMaterial ? 0.5 : 0;
  const masterworkMultiplier = item.masterwork ? 0.5 : 0;
  const hours = Math.round(complexityHours[item.complexity] * (1 + materialMultiplier + masterworkMultiplier));
  const dc =
    10 +
    complexityDcModifier[item.complexity] +
    (item.masterwork ? 4 : 0) +
    (item.specialMaterial ? specialMaterialDc[item.specialMaterial] ?? 0 : 0);

  return { hours, dc };
}

export function getProjectRequirements(project: ForgeProject): { hours: number; dc: number } {
  if (project.resolutionMode === "craftingPdf") {
    return deriveCraftingStats(project.item);
  }

  return { hours: project.requiredHours, dc: project.craftDc };
}

export function generateMonthlyEvents(month: number, seed: string): MonthlyEvent[] {
  return eventSources.map((source) => {
    const rng = makeRng(`${seed}:${month}:${source}`);
    const deck = eventDeck[source];
    const selected = deck[Math.floor(rng() * deck.length)];

    return {
      ...selected,
      id: `${month}-${source.toLowerCase()}`,
      source,
      locked: false,
    };
  });
}

export function summarizeModifiers(events: MonthlyEvent[]): Required<EventModifier> {
  return events.reduce(
    (total, event) => ({
      laborHours: total.laborHours + (event.modifier.laborHours ?? 0),
      shopSalesGp: total.shopSalesGp + (event.modifier.shopSalesGp ?? 0),
      reputation: total.reputation + (event.modifier.reputation ?? 0),
      materialDiscountPct: total.materialDiscountPct + (event.modifier.materialDiscountPct ?? 0),
      prestige: total.prestige + (event.modifier.prestige ?? 0),
    }),
    {
      laborHours: 0,
      shopSalesGp: 0,
      reputation: 0,
      materialDiscountPct: 0,
      prestige: 0,
    },
  );
}

export function availableLabor(state: CampaignState): number {
  const modifier = summarizeModifiers(state.events);
  return Math.max(0, state.profile.baseMonthlyHours + state.profile.ringOfSustenanceHours + modifier.laborHours);
}

export function usedLabor(labor: LaborAllocation): number {
  return (
    Object.values(labor.projectHours).reduce((total, hours) => total + Math.max(0, hours || 0), 0) +
    Math.max(0, labor.genericInventory || 0) +
    Math.max(0, labor.repairs || 0) +
    Math.max(0, labor.apprenticeTraining || 0) +
    Math.max(0, labor.miscellaneous || 0)
  );
}

export function outcomeFromMargin(margin: number): Outcome {
  if (margin >= 10) return "Exceptional";
  if (margin >= 5) return "Excellent";
  if (margin >= 0) return "Normal";
  if (margin <= -5) return "Material Loss";
  return "Delay";
}

export function shadeTowardAnchor(trueMargin: number, anchor: number, cap: number): number {
  if (trueMargin <= 0) return trueMargin;
  const delta = trueMargin - anchor;
  return Math.round(anchor + cap * Math.tanh(delta / Math.max(1, cap)));
}

export function materialRowsFromRecipe(
  recipe: ForgeItem["materialRecipe"],
  suppliedBy: "taark" | "client" = "taark",
  reimbursed = false,
): ProjectMaterial[] {
  return (Object.entries(recipe) as Array<[MaterialName, number]>).map(([material, lbs]) => ({
    material,
    lbs,
    suppliedBy,
    reimbursed,
  }));
}

function materialCost(materials: MaterialInventory, row: ProjectMaterial): number {
  return row.lbs * (row.costPerLb ?? materials[row.material]?.gpPerLb ?? defaultMaterialCosts[row.material]);
}

export function calculateProjectFinancials(
  project: ForgeProject,
  materials: MaterialInventory,
  anchor: number,
  cap: number,
): ProjectFinancials {
  const physicalRows = project.materials.filter((row) => row.suppliedBy === "taark");
  const trueMaterialCost =
    project.materialSupplyMode === "client_supplies" || project.materialSupplyMode === "no_material_cost"
      ? 0
      : physicalRows.reduce((total, row) => total + materialCost(materials, row), 0);
  const reimbursedRows = physicalRows.filter(
    (row) => row.reimbursed || project.materialSupplyMode === "client_reimburses",
  );
  const materialReimbursement =
    project.materialSupplyMode === "no_material_cost"
      ? 0
      : reimbursedRows.reduce((total, row) => total + materialCost(materials, row), 0) +
        (project.materialReimbursementPaid ?? 0);
  const trueRevenue =
    project.payoutMode === "dm_fixed_amount"
      ? project.dmFixedPayout ?? 0
      : project.payoutMode === "no_payment"
        ? 0
        : project.payoutMode === "materials_only"
          ? materialReimbursement
          : project.payoutMode === "labor_only"
            ? project.laborFee
            : project.payoutMode === "materials_plus_labor"
              ? materialReimbursement + project.laborFee
              : project.trueContractValue;
  const trueMargin =
    project.economicMode === "break_even"
      ? 0
      : project.economicMode === "profit_bearing" || project.economicMode === "dm_override"
        ? trueRevenue - materialReimbursement - (trueMaterialCost - materialReimbursement) - project.specialExpenses
        : 0;

  const isProfitCoupled = project.economicMode === "profit_bearing" || project.economicMode === "dm_override";
  const shadedProfit =
    project.economicMode === "dm_override"
      ? project.dmFixedPayout ?? trueMargin
      : isProfitCoupled
        ? shadeTowardAnchor(trueMargin, anchor, cap)
        : 0;
  const recognitionRatio =
    isProfitCoupled && trueMargin > 0 ? Math.max(0, Math.min(1, shadedProfit / trueMargin)) : 0;
  const recognizedMaterialBurden = Math.round(trueMaterialCost * recognitionRatio);
  const recognizedSpecialExpenses = Math.round(project.specialExpenses * recognitionRatio);
  const recognizedRevenue = recognizedMaterialBurden + recognizedSpecialExpenses + shadedProfit;
  const unreimbursedMaterialCost = Math.max(0, trueMaterialCost - materialReimbursement);
  const opportunityCost = isProfitCoupled ? 0 : Math.max(0, project.hoursInvested * 7 + unreimbursedMaterialCost + project.specialExpenses);
  const netCashImpact = isProfitCoupled
    ? shadedProfit
    : project.economicMode === "break_even"
      ? 0
      : project.economicMode === "internal_asset" || project.economicMode === "no_revenue" || project.economicMode === "reputation_only"
        ? -Math.max(0, unreimbursedMaterialCost + project.specialExpenses)
        : trueRevenue - trueMaterialCost - project.specialExpenses;

  const physicalMaterialsConsumed = physicalRows.map((row) => ({
    material: row.material,
    lbs: row.lbs,
    gpEquivalent: Math.round(materialCost(materials, row)),
  }));
  const recognizedMaterialsConsumed = physicalRows.map((row) => ({
    material: row.material,
    lbsEquivalent: Number((row.lbs * recognitionRatio).toFixed(2)),
    gpEquivalent: Math.round(materialCost(materials, row) * recognitionRatio),
  }));
  const unrecognizedMaterialBalance = physicalRows.map((row) => ({
    material: row.material,
    lbsEquivalent: Number((row.lbs * (1 - recognitionRatio)).toFixed(2)),
    gpEquivalent: Math.round(materialCost(materials, row) * (1 - recognitionRatio)),
    note: isProfitCoupled
      ? "Deferred from the DM-balanced monthly economy."
      : "Physical obligation/investment outside paid commission profit.",
  }));

  return {
    projectId: project.id,
    projectName: project.name,
    kind: project.kind,
    economicMode: project.economicMode,
    materialSupplyMode: project.materialSupplyMode,
    payoutMode: project.payoutMode,
    trueProjectValue: trueRevenue,
    trueMaterialCost,
    trueSpecialExpenses: project.specialExpenses,
    trueMargin,
    grossCashReceived: trueRevenue + (project.depositPaid ?? 0),
    materialReimbursement,
    recognizedProfit: shadedProfit,
    recognizedRevenue,
    recognizedMaterialBurden,
    recognizedSpecialExpenses,
    unreimbursedMaterialCost,
    netCashImpact,
    recognitionRatio,
    opportunityCost,
    materialAccounting: {
      physicalMaterialsConsumed,
      recognizedMaterialsConsumed,
      unrecognizedMaterialBalance,
    },
    createsInternalAsset: project.createsInternalAsset,
    reportLines: [
      `True Project Value: ${trueRevenue.toLocaleString()} gp`,
      `True Material Cost: ${Math.round(trueMaterialCost).toLocaleString()} gp`,
      `True Margin: ${Math.round(trueMargin).toLocaleString()} gp`,
      `Shaded Monthly Profit: ${Math.round(shadedProfit).toLocaleString()} gp`,
      `Recognition Ratio: ${Math.round(recognitionRatio * 100)}%`,
      `Opportunity Cost: ${Math.round(opportunityCost).toLocaleString()} gp`,
    ],
  };
}

function consumeProjectMaterials(materials: MaterialInventory, project: ForgeProject) {
  const next = { ...materials };
  for (const row of project.materials) {
    if (row.suppliedBy !== "taark" || project.materialSupplyMode === "client_supplies") continue;
    next[row.material] = {
      ...next[row.material],
      lbs: Math.max(0, next[row.material].lbs - row.lbs),
    };
  }
  return next;
}

function hasMaterials(materials: MaterialInventory, requirement: ForgeItem["materialRecipe"]) {
  return (Object.entries(requirement) as Array<[MaterialName, number]>).every(
    ([material, amount]) => materials[material].lbs >= amount,
  );
}

function consumeInventoryMaterials(materials: MaterialInventory, requirement: ForgeItem["materialRecipe"]) {
  const next = { ...materials };
  for (const [material, amount] of Object.entries(requirement) as Array<[MaterialName, number]>) {
    next[material] = { ...next[material], lbs: Math.max(0, next[material].lbs - amount) };
  }
  return next;
}

function replenishInventory(
  inventory: InventoryItem[],
  materials: MaterialInventory,
  genericHours: number,
): { inventory: InventoryItem[]; materials: MaterialInventory; notes: string[] } {
  let hours = genericHours;
  let nextMaterials = { ...materials };
  const notes: string[] = [];
  const next = inventory.map((stock) => {
    const requirements = deriveCraftingStats(stock.item);
    let quantity = stock.quantity;

    while (quantity < stock.target && hours >= requirements.hours) {
      if (!hasMaterials(nextMaterials, stock.item.materialRecipe)) {
        notes.push(`Shelf stock delayed for ${stock.item.name}: tracked metals are short.`);
        break;
      }

      quantity += 1;
      hours -= requirements.hours;
      nextMaterials = consumeInventoryMaterials(nextMaterials, stock.item.materialRecipe);
      notes.push(`Finished speculative inventory: ${stock.item.name}.`);
    }

    return { ...stock, quantity };
  });

  return { inventory: next, materials: nextMaterials, notes };
}

export const eventActors: EventActor[] = [
  "Tyrande",
  "Riff",
  "Stigandur",
  "Galenthyr",
  "Valthen",
  "Jordy",
  "Guild",
  "City",
];

const actorEffectProfiles: Record<
  EventActor,
  {
    titleGood: string;
    titleBad: string;
    hours?: number;
    sales?: number;
    materialCost?: number;
    materialWaste?: number;
    reputation?: number;
    craft?: number;
  }
> = {
  Tyrande: {
    titleGood: "Tyrande Opens Noble Doors",
    titleBad: "Tyrande's Timetable Tightens",
    hours: -18,
    sales: 260,
    reputation: 1,
  },
  Riff: {
    titleGood: "Riff Finds a Procurement Angle",
    titleBad: "Riff's Lead Goes Sideways",
    sales: 140,
    materialCost: -8,
    materialWaste: -4,
  },
  Stigandur: {
    titleGood: "Stigandur Sends Steady Walk-Ins",
    titleBad: "Stigandur Costs Taark a Morning",
    hours: -20,
    sales: 220,
  },
  Galenthyr: {
    titleGood: "Galenthyr Sings the Forge's Name",
    titleBad: "Galenthyr Draws a Distracted Crowd",
    sales: 360,
    reputation: 1,
  },
  Valthen: {
    titleGood: "Valthen Keeps the Benches Moving",
    titleBad: "Valthen's Help Needs Rework",
    hours: 42,
    craft: 1,
  },
  Jordy: {
    titleGood: "Jordy Learns Faster Than Expected",
    titleBad: "Jordy Sorts Everything Twice",
    hours: 18,
    reputation: 1,
  },
  Guild: {
    titleGood: "The Guild Sends Useful Attention",
    titleBad: "The Guild Inspection Drags",
    hours: -12,
    sales: 300,
    reputation: 1,
  },
  City: {
    titleGood: "Waterdeep Trade Surges",
    titleBad: "Dock Ward Weather Bites",
    hours: -16,
    sales: 260,
    materialCost: 4,
  },
};

function cloneMaterials(materials: MaterialInventory): MaterialInventory {
  return Object.fromEntries(
    (Object.entries(materials) as Array<[MaterialName, { lbs: number; gpPerLb: number }]>).map(([material, value]) => [
      material,
      { ...value },
    ]),
  ) as MaterialInventory;
}

function clampD20(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(1, Math.min(20, Math.round(value as number)));
}

function percentile(values: number[], point: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * point)));
  return Math.round(sorted[index]);
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance));
}

export function eventStrength(roll: number): number {
  return (roll - 10.5) / 9.5;
}

export function craftQualityFromRoll(roll: number): CraftQuality {
  if (roll === 20) return "natural_20";
  if (roll >= 17) return "exceptional";
  if (roll >= 13) return "excellent";
  if (roll >= 9) return "success";
  if (roll >= 5) return "minor_failure";
  return "bad_failure";
}

export function progressEfficiencyFromRoll(roll: number): number {
  if (roll <= 4) return 0.5;
  if (roll <= 8) return 0.75;
  if (roll <= 12) return 1;
  if (roll <= 16) return 1.15;
  if (roll <= 19) return 1.3;
  return 1.5;
}

export function createEventResolution(actor: EventActor, roll: number): MonthlyResolutionSimulation["events"][number] {
  const normalizedRoll = clampD20(roll) ?? 10;
  const strength = eventStrength(normalizedRoll);
  const profile = actorEffectProfiles[actor];
  const positive = normalizedRoll >= 11;
  const effects = {
    hoursModifier: Math.round((profile.hours ?? 0) * strength),
    genericSalesModifier: Math.round((profile.sales ?? 0) * strength),
    materialCostModifier: Math.round((profile.materialCost ?? 0) * strength),
    materialWasteModifier: Math.round((profile.materialWaste ?? 0) * strength),
    reputationModifier: Math.abs(strength) >= 0.8 ? Math.sign(strength) * Math.min(1, profile.reputation ?? 0) : 0,
    craftRollModifier: Math.round((profile.craft ?? 0) * strength),
  };

  return {
    actor,
    roll: normalizedRoll,
    strength,
    title: positive ? profile.titleGood : profile.titleBad,
    flavorText: positive
      ? `${actor} nudges the month in Taark's favor.`
      : `${actor}'s thread in the month adds a complication.`,
    effects,
  };
}

export function createResolutionDraft(state: CampaignState): MonthlyResolutionDraft {
  const active = state.projects.filter((project) => project.status === "queued" || project.status === "in_progress");
  const projectPlans = active.map((project) => ({
    projectId: project.id,
    selected: (state.labor.projectHours[project.id] ?? 0) > 0,
    allocatedHours: Math.max(0, state.labor.projectHours[project.id] ?? 0),
  }));
  const commissionWorkHours = projectPlans.reduce((total, plan) => total + (plan.selected ? plan.allocatedHours : 0), 0);
  const hourInputs = {
    baseHours: state.profile.baseMonthlyHours,
    ringOfSustenanceBonus: state.profile.ringOfSustenanceHours,
    workaholicBonus: 60,
    eventHourModifier: 0,
    totalAvailableHours: state.profile.baseMonthlyHours + state.profile.ringOfSustenanceHours + 60,
  };

  return {
    version: 1,
    month: state.currentMonth,
    stage: "planning",
    hourInputs,
    allocation: {
      commissionWorkHours,
      genericShopWorkHours: Math.max(0, state.labor.genericInventory || 0),
      repairsWalkinsHours: Math.max(0, state.labor.repairs || 0),
      jordyTrainingHours: Math.max(0, state.labor.apprenticeTraining || 0),
    },
    projectPlans,
    eventRolls: {},
    taarkRolls: {},
    projectRolls: projectPlans.map((plan) => ({ projectId: plan.projectId })),
    playback: {
      cardIndex: 0,
      autoplay: false,
      speed: "normal",
    },
    warnings: [],
  };
}

function selectedPlans(draft: MonthlyResolutionDraft) {
  return draft.projectPlans.filter((plan) => plan.selected);
}

function plannedWorkTotal(draft: MonthlyResolutionDraft): number {
  return (
    Math.max(0, draft.allocation.commissionWorkHours) +
    Math.max(0, draft.allocation.genericShopWorkHours) +
    Math.max(0, draft.allocation.repairsWalkinsHours) +
    Math.max(0, draft.allocation.jordyTrainingHours)
  );
}

function recomputedTotalHours(draft: MonthlyResolutionDraft): number {
  return (
    Math.max(0, draft.hourInputs.baseHours) +
    Math.max(0, draft.hourInputs.ringOfSustenanceBonus) +
    Math.max(0, draft.hourInputs.workaholicBonus) +
    Math.round(draft.hourInputs.eventHourModifier || 0)
  );
}

function boundedReputationChange(rawChange: number): number {
  return Math.max(-1, Math.min(1, rawChange));
}

function projectReputationChange(project: ForgeProject, quality: CraftQuality): number {
  if (quality === "natural_20" || quality === "exceptional") return 1;
  if (project.prestige >= 2 && project.reputationEffectOnCompletion > 0) return 1;
  return 0;
}

function targetedShopDemand(
  state: CampaignState,
  effective: ReturnType<typeof effectiveAllocation>,
  eventSalesModifier: number,
  shopRoll: number,
  materialWaste: number,
): number {
  const target = state.profile.dmTargetProfitGp;
  const sigma = Math.max(350, state.profile.dmTargetVolatilityGp);
  const rollSwing = Math.round((shopRoll - 10.5) * (sigma / 9.5));
  const shelfHoursModifier = Math.round((effective.genericShopWorkHours - 80) * 3.5);
  const repairProfit = Math.round(effective.repairsWalkinsHours * 7);
  const eventPressure = Math.round(eventSalesModifier * 0.35);
  const desiredNonCommissionNet = target + rollSwing + shelfHoursModifier + eventPressure - Math.max(0, materialWaste);

  return Math.max(0, desiredNonCommissionNet + state.profile.genericShopCostsGp - repairProfit);
}

export function validateResolutionPlan(state: CampaignState, draft: MonthlyResolutionDraft): string[] {
  const warnings: string[] = [];
  const selectedProjectHours = selectedPlans(draft).reduce((total, plan) => total + Math.max(0, plan.allocatedHours), 0);
  const totalAvailable = recomputedTotalHours(draft);
  const activeById = new Map(state.projects.map((project) => [project.id, project]));

  if (selectedProjectHours > draft.allocation.commissionWorkHours) {
    warnings.push("Commission allocation exceeds available commission hours.");
  }
  if (selectedProjectHours < draft.allocation.commissionWorkHours) {
    warnings.push(`${draft.allocation.commissionWorkHours - selectedProjectHours} commission hours are unused.`);
  }
  if (plannedWorkTotal(draft) > totalAvailable) {
    warnings.push("Planned work exceeds total available forge hours.");
  }

  for (const plan of selectedPlans(draft)) {
    const project = activeById.get(plan.projectId);
    if (!project) continue;
    const requirements = getProjectRequirements(project);
    if (project.hoursInvested + plan.allocatedHours < requirements.hours) {
      warnings.push(`${project.name} cannot plausibly complete this month without strong rolls.`);
    }
    for (const row of project.materials) {
      if (row.suppliedBy === "taark" && state.materials[row.material].lbs < row.lbs) {
        warnings.push(`${project.name} needs more ${row.material} than Taark has on hand.`);
      }
    }
  }

  const deficitCount = state.inventory.filter((stock) => stock.quantity < stock.target).length;
  if (deficitCount > 0 && draft.allocation.genericShopWorkHours < 80) {
    warnings.push("Generic inventory is underfunded against current target-stock deficits.");
  }

  return warnings;
}

function effectiveAllocation(draft: MonthlyResolutionDraft, eventHourModifier: number) {
  const available = Math.max(0, recomputedTotalHours(draft) + eventHourModifier);
  const requested = plannedWorkTotal(draft);
  const scale = requested > available && requested > 0 ? available / requested : 1;
  const projectScale = draft.allocation.commissionWorkHours > 0 ? Math.min(1, scale) : 1;
  const projectHours = Object.fromEntries(
    selectedPlans(draft).map((plan) => [plan.projectId, Math.floor(Math.max(0, plan.allocatedHours) * projectScale)]),
  );

  return {
    available,
    scale,
    unusedHours: Math.max(0, available - requested),
    commissionWorkHours: Math.floor(Math.max(0, draft.allocation.commissionWorkHours) * scale),
    genericShopWorkHours: Math.floor(Math.max(0, draft.allocation.genericShopWorkHours) * scale),
    repairsWalkinsHours: Math.floor(Math.max(0, draft.allocation.repairsWalkinsHours) * scale),
    jordyTrainingHours: Math.floor(Math.max(0, draft.allocation.jordyTrainingHours) * scale),
    projectHours,
  };
}

function inventoryValueCapacity(inventory: InventoryItem[]): number {
  return inventory.reduce((total, stock) => total + stock.quantity * stock.item.basePriceGp, 0);
}

function produceInventory(
  inventory: InventoryItem[],
  materials: MaterialInventory,
  hours: number,
  efficiency: number,
): { inventory: InventoryItem[]; materials: MaterialInventory; itemsProduced: Array<{ itemName: string; quantity: number }> } {
  let usableHours = Math.max(0, Math.floor(hours * efficiency));
  let nextMaterials = cloneMaterials(materials);
  const produced: Array<{ itemName: string; quantity: number }> = [];
  const nextInventory = inventory.map((stock) => {
    const requirements = deriveCraftingStats(stock.item);
    let quantity = stock.quantity;
    let producedQuantity = 0;

    while (quantity < stock.target && usableHours >= requirements.hours && hasMaterials(nextMaterials, stock.item.materialRecipe)) {
      quantity += 1;
      producedQuantity += 1;
      usableHours -= requirements.hours;
      nextMaterials = consumeInventoryMaterials(nextMaterials, stock.item.materialRecipe);
    }

    if (producedQuantity > 0) {
      produced.push({ itemName: stock.item.name, quantity: producedQuantity });
    }

    return { ...stock, quantity };
  });

  return { inventory: nextInventory, materials: nextMaterials, itemsProduced: produced };
}

function sellInventory(
  inventory: InventoryItem[],
  demandGp: number,
): { inventory: InventoryItem[]; shopSales: number; itemsSold: Array<{ itemName: string; quantity: number; gp: number }>; unmetDemand: number } {
  let remainingDemand = Math.max(0, demandGp);
  let shopSales = 0;
  const itemsSold: Array<{ itemName: string; quantity: number; gp: number }> = [];
  const nextInventory = inventory.map((stock) => {
    let quantity = stock.quantity;
    let sold = 0;
    while (quantity > 0 && remainingDemand >= stock.item.basePriceGp * 0.5) {
      quantity -= 1;
      sold += 1;
      shopSales += stock.item.basePriceGp;
      remainingDemand -= stock.item.basePriceGp;
    }
    if (sold > 0) {
      itemsSold.push({ itemName: stock.item.name, quantity: sold, gp: sold * stock.item.basePriceGp });
    }
    return { ...stock, quantity };
  });

  return {
    inventory: nextInventory,
    shopSales,
    itemsSold,
    unmetDemand: Math.max(0, Math.round(remainingDemand)),
  };
}

function ambientShopSales(unmetDemand: number): number {
  return Math.round(Math.max(0, unmetDemand) * 0.82);
}

function materialShortageForSelected(state: CampaignState, draft: MonthlyResolutionDraft): boolean {
  return selectedPlans(draft).some((plan) => {
    const project = state.projects.find((candidate) => candidate.id === plan.projectId);
    if (!project) return false;
    return project.materials.some((row) => row.suppliedBy === "taark" && state.materials[row.material].lbs < row.lbs);
  });
}

function recommendationFromForecast(result: ForecastResult): string[] {
  const recommendations: string[] = [];
  if (result.probabilityInventoryDemandExceedsStock > 0.35) {
    recommendations.push("Shop sales are inventory-limited. Moving more time into generic shop work would stabilize expected income.");
  }
  if (result.probabilityNegativeProfit > 0.25) {
    recommendations.push("This plan carries a meaningful risk of a negative month.");
  }
  if (Object.values(result.probabilityEachProjectCompletes).some((chance) => chance > 0.7)) {
    recommendations.push("This plan strongly favors commission completion over shop restocking.");
  }
  if (recommendations.length === 0) {
    recommendations.push("This plan is balanced: expected income, project progress, and inventory risk are all within a stable range.");
  }
  return recommendations;
}

export function forecastMonthlyPlan(state: CampaignState, draft: MonthlyResolutionDraft, iterations = 3000): ForecastResult {
  const count = Math.max(1, iterations);
  const rng = makeRng(`${state.settings.randomSeed}:${state.currentMonth}:forecast:${JSON.stringify(draft.projectPlans)}`);
  const totals: number[] = [];
  const commissionTotals: number[] = [];
  const shopTotals: number[] = [];
  const repairTotals: number[] = [];
  const completionCounts: Record<string, number> = {};
  const excellentCounts: Record<string, number> = {};
  const soldTotals: Record<string, number> = {};
  const deficitTotals: Record<string, number> = {};
  let shortageCount = 0;
  let demandExceededCount = 0;
  let negativeCount = 0;

  for (let index = 0; index < count; index += 1) {
    const actorEvents = eventActors.map((actor) => createEventResolution(actor, Math.floor(rng() * 20) + 1));
    const eventHours = actorEvents.reduce((total, event) => total + (event.effects.hoursModifier ?? 0), 0);
    const eventSales = actorEvents.reduce((total, event) => total + (event.effects.genericSalesModifier ?? 0), 0);
    const effective = effectiveAllocation(draft, eventHours);
    const genericRoll = Math.floor(rng() * 20) + 1;
    const shopRoll = Math.floor(rng() * 20) + 1;
    const materialRoll = Math.floor(rng() * 20) + 1;
    let nextMaterials = cloneMaterials(state.materials);
    let nextInventory = state.inventory.map((stock) => ({ ...stock }));
    let commissionProfit = 0;
    const materialShortage = materialShortageForSelected(state, draft);

    for (const plan of selectedPlans(draft)) {
      const project = state.projects.find((candidate) => candidate.id === plan.projectId);
      if (!project) continue;
      const roll = Math.floor(rng() * 20) + 1;
      const quality = craftQualityFromRoll(roll);
      const requirements = getProjectRequirements(project);
      const progressAdded = Math.floor((effective.projectHours[project.id] ?? 0) * progressEfficiencyFromRoll(roll));
      const completed = project.hoursInvested + progressAdded >= requirements.hours;
      if (completed) {
        completionCounts[project.id] = (completionCounts[project.id] ?? 0) + 1;
        const completedProject = { ...project, hoursInvested: requirements.hours, status: "completed" as const };
        commissionProfit += calculateProjectFinancials(
          completedProject,
          nextMaterials,
          state.profile.commissionAnchorGp,
          state.profile.commissionSpikeCapGp,
        ).netCashImpact;
      }
      if (quality === "excellent" || quality === "exceptional" || quality === "natural_20") {
        excellentCounts[project.id] = (excellentCounts[project.id] ?? 0) + 1;
      }
    }

    const production = produceInventory(nextInventory, nextMaterials, effective.genericShopWorkHours, progressEfficiencyFromRoll(genericRoll));
    nextInventory = production.inventory;
    nextMaterials = production.materials;
    const materialWaste = materialRoll <= 4 ? Math.round(inventoryValueCapacity(nextInventory) * 0.02) : 0;
    const demand = targetedShopDemand(state, effective, eventSales, shopRoll, materialWaste);
    const inventoryCapacity = inventoryValueCapacity(nextInventory);
    const sale = sellInventory(nextInventory, demand);
    const repairProfit = Math.round(effective.repairsWalkinsHours * 7);
    const shopSales = sale.shopSales + ambientShopSales(sale.unmetDemand);
    const monthTotal = commissionProfit + shopSales + repairProfit - state.profile.genericShopCostsGp - materialWaste;

    if (materialShortage) shortageCount += 1;
    if (demand > inventoryCapacity) demandExceededCount += 1;
    if (monthTotal < 0) negativeCount += 1;
    totals.push(monthTotal);
    commissionTotals.push(commissionProfit);
    shopTotals.push(shopSales);
    repairTotals.push(repairProfit);

    for (const sold of sale.itemsSold) {
      soldTotals[sold.itemName] = (soldTotals[sold.itemName] ?? 0) + sold.quantity;
    }
    for (const stock of sale.inventory) {
      const deficit = Math.max(0, stock.target - stock.quantity);
      if (deficit > 0) {
        deficitTotals[stock.item.name] = (deficitTotals[stock.item.name] ?? 0) + deficit;
      }
    }
  }

  const average = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) / Math.max(1, values.length));
  const selected = selectedPlans(draft);
  const result: ForecastResult = {
    expectedTotalProfit: average(totals),
    profitSigma: standardDeviation(totals),
    profitP10: percentile(totals, 0.1),
    profitP50: percentile(totals, 0.5),
    profitP90: percentile(totals, 0.9),
    expectedCommissionProfit: average(commissionTotals),
    expectedGenericShopProfit: average(shopTotals),
    expectedRepairMiscProfit: average(repairTotals),
    probabilityEachProjectCompletes: Object.fromEntries(selected.map((plan) => [plan.projectId, (completionCounts[plan.projectId] ?? 0) / count])),
    probabilityEachProjectExcellentOrBetter: Object.fromEntries(selected.map((plan) => [plan.projectId, (excellentCounts[plan.projectId] ?? 0) / count])),
    probabilityAnyMaterialShortage: shortageCount / count,
    probabilityInventoryDemandExceedsStock: demandExceededCount / count,
    probabilityNegativeProfit: negativeCount / count,
    expectedItemsSold: Object.entries(soldTotals).map(([itemName, quantity]) => ({
      itemName,
      expectedQuantitySold: Number((quantity / count).toFixed(2)),
    })),
    expectedInventoryDeficitsAfterMonth: Object.entries(deficitTotals).map(([itemName, deficit]) => ({
      itemName,
      expectedDeficit: Number((deficit / count).toFixed(2)),
    })),
    warnings: validateResolutionPlan(state, draft),
    recommendations: [],
  };
  result.recommendations = recommendationFromForecast(result);
  return result;
}

function requiredRollWarnings(state: CampaignState, draft: MonthlyResolutionDraft): string[] {
  const warnings: string[] = [];
  for (const actor of eventActors) {
    const roll = draft.eventRolls[actor];
    if (!roll || roll < 1 || roll > 20) warnings.push(`${actor} needs a d20 roll.`);
  }
  for (const [label, roll] of Object.entries(draft.taarkRolls)) {
    if (!roll || roll < 1 || roll > 20) warnings.push(`Taark ${label} needs a d20 roll.`);
  }
  for (const label of ["shopSales", "genericInventoryReplenishment", "materialManagement"] as const) {
    const roll = draft.taarkRolls[label];
    if (!roll || roll < 1 || roll > 20) warnings.push(`Taark ${label} needs a d20 roll.`);
  }
  for (const plan of selectedPlans(draft)) {
    const project = state.projects.find((candidate) => candidate.id === plan.projectId);
    const roll = draft.projectRolls.find((candidate) => candidate.projectId === plan.projectId)?.roll;
    if (!roll || roll < 1 || roll > 20) warnings.push(`${project?.name ?? "Selected project"} needs a crafting d20 roll.`);
  }
  return Array.from(new Set(warnings));
}

function ledgerForecastFromSimulation(simulation: MonthlyResolutionSimulation): ForecastBreakdown {
  return {
    paidCommissionProfit: simulation.report.controlledRecognizedCommissionProfit,
    nonprofitPrestigeHours: simulation.report.projectReports
      .filter((project) => project.recognizedProfit === 0)
      .reduce((total, project) => total + project.hoursAdded, 0),
    internalInvestmentCost: 0,
    inventoryProductionHours: simulation.report.genericInventoryHours,
    shopSales: simulation.report.genericShopProfit,
    materialRisk: simulation.report.materialPurchasesLosses > 3000 ? "High" : simulation.report.materialPurchasesLosses > 1000 ? "Moderate" : "Low",
    warnings: simulation.forecast.warnings,
  };
}

export function resolveMonthlyDraft(state: CampaignState, draft: MonthlyResolutionDraft): MonthlyResolutionSimulation {
  const rollWarnings = requiredRollWarnings(state, draft);
  if (rollWarnings.length > 0) {
    throw new Error(rollWarnings[0]);
  }

  const forecast = draft.forecast ?? forecastMonthlyPlan(state, draft);
  const events = eventActors.map((actor) => createEventResolution(actor, draft.eventRolls[actor] ?? 10));
  const eventHourModifier = events.reduce((total, event) => total + (event.effects.hoursModifier ?? 0), 0);
  const eventSalesModifier = events.reduce((total, event) => total + (event.effects.genericSalesModifier ?? 0), 0);
  const eventReputationModifier = events.reduce((total, event) => total + (event.effects.reputationModifier ?? 0), 0);
  const materialCostModifierPct = events.reduce((total, event) => total + (event.effects.materialCostModifier ?? 0), 0);
  const effective = effectiveAllocation(draft, eventHourModifier);
  const cards: ResolutionCard[] = [];
  const eventLog: string[] = [];
  let nextMaterials = cloneMaterials(state.materials);
  let nextInventory = state.inventory.map((stock) => ({ ...stock }));
  const projectReports: MonthlyResolutionReport["projectReports"] = [];
  let grossCommissionProjectValue = 0;
  let recognizedCommissionProfit = 0;
  let materialPurchasesLosses = 0;
  let rawReputationChange = eventReputationModifier;

  for (const event of events) {
    const effectText = [
      event.effects.hoursModifier ? `${event.effects.hoursModifier > 0 ? "+" : ""}${event.effects.hoursModifier}h` : "",
      event.effects.genericSalesModifier ? `${event.effects.genericSalesModifier > 0 ? "+" : ""}${event.effects.genericSalesModifier} gp sales pressure` : "",
      event.effects.reputationModifier ? `${event.effects.reputationModifier > 0 ? "+" : ""}${event.effects.reputationModifier} reputation` : "",
    ].filter(Boolean).join(", ") || "No major mechanical change.";
    cards.push({
      id: `event-${event.actor}`,
      title: event.title,
      subtitle: `${event.actor} event`,
      actorOrSystem: event.actor,
      roll: event.roll,
      flavorText: event.flavorText,
      mechanicalEffectText: effectText,
      effectTags: ["event"],
    });
    eventLog.push(`${event.actor} (${event.roll}): ${event.title}. ${effectText}`);
  }

  cards.push({
    id: "hours",
    title: "The Month's Work Takes Shape",
    actorOrSystem: "Hours",
    flavorText: effective.scale < 1 ? "The month tightens, so every plan is trimmed proportionally." : "The plan fits within the forge's available time.",
    mechanicalEffectText: `${effective.available}h available; ${Math.round(effective.scale * 100)}% work scale; ${effective.unusedHours}h unassigned.`,
    effectTags: ["hours"],
  });

  state.projects.forEach((project) => {
    const plan = draft.projectPlans.find((candidate) => candidate.projectId === project.id && candidate.selected);
    if (!plan || (project.status !== "queued" && project.status !== "in_progress")) return;

    const roll = draft.projectRolls.find((candidate) => candidate.projectId === project.id)?.roll ?? 10;
    const quality = craftQualityFromRoll(roll);
    const requirements = getProjectRequirements(project);
    const hoursBefore = project.hoursInvested;
    const hoursAdded = Math.floor((effective.projectHours[project.id] ?? 0) * progressEfficiencyFromRoll(roll));
    const hoursAfter = Math.min(requirements.hours, hoursBefore + hoursAdded);
    const completedThisMonth = hoursAfter >= requirements.hours;
    const report = calculateProjectFinancials(
      { ...project, hoursInvested: hoursAfter, status: completedThisMonth ? "completed" : "in_progress" },
      nextMaterials,
      state.profile.commissionAnchorGp,
      state.profile.commissionSpikeCapGp,
    );

    if (completedThisMonth) {
      grossCommissionProjectValue += report.grossCashReceived;
      recognizedCommissionProfit += report.netCashImpact;
      materialPurchasesLosses += report.trueMaterialCost;
      rawReputationChange += projectReputationChange(project, quality);
      nextMaterials = consumeProjectMaterials(nextMaterials, project);
    }

    const projectReport = {
      projectId: project.id,
      name: project.name,
      kind: project.kind,
      client: project.client,
      hoursBefore,
      hoursAdded,
      hoursAfter,
      requiredHours: requirements.hours,
      progressPercentage: Math.min(100, Math.round((hoursAfter / requirements.hours) * 100)),
      craftingRoll: roll,
      quality,
      completedThisMonth,
      recognizedProfit: completedThisMonth ? report.netCashImpact : 0,
      physicalMaterialsConsumed: completedThisMonth ? report.materialAccounting.physicalMaterialsConsumed : [],
      recognizedMaterialBurden: completedThisMonth ? report.recognizedMaterialBurden : 0,
      reputationPrestigeEffect: completedThisMonth ? projectReputationChange(project, quality) : 0,
    };
    projectReports.push(projectReport);
    cards.push({
      id: `project-${project.id}`,
      title: project.name,
      subtitle: project.client ? `for ${project.client}` : project.kind,
      actorOrSystem: "Taark",
      roll,
      flavorText: completedThisMonth ? "The last hammer falls and the work is ready." : "The work advances, but the bench keeps its claim into next month.",
      mechanicalEffectText: `${hoursBefore}h -> ${hoursAfter}h of ${requirements.hours}h; ${quality.replace("_", " ")}; ${completedThisMonth ? "completed" : "in progress"}.`,
      effectTags: ["project", quality],
    });
    eventLog.push(`${project.name}: roll ${roll}, ${hoursAdded}h progress, ${completedThisMonth ? "completed" : "not complete"}.`);

  });

  const genericRoll = draft.taarkRolls.genericInventoryReplenishment ?? 10;
  const production = produceInventory(nextInventory, nextMaterials, effective.genericShopWorkHours, progressEfficiencyFromRoll(genericRoll));
  nextInventory = production.inventory;
  nextMaterials = production.materials;
  cards.push({
    id: "generic-inventory",
    title: "Shelves and Stock",
    actorOrSystem: "Taark",
    roll: genericRoll,
    flavorText: "Standard goods come off the bench between larger obligations.",
    mechanicalEffectText: production.itemsProduced.length
      ? production.itemsProduced.map((item) => `${item.quantity} ${item.itemName}`).join(", ")
      : "No target-stock items completed.",
    effectTags: ["inventory"],
  });

  const shopRoll = draft.taarkRolls.shopSales ?? 10;
  const repairMiscProfit = Math.round(effective.repairsWalkinsHours * 7);
  const materialRoll = draft.taarkRolls.materialManagement ?? 10;
  const materialAdjustment = Math.round(materialPurchasesLosses * (materialCostModifierPct / 100));
  const materialWaste = materialRoll <= 4 ? Math.round(Math.max(100, materialPurchasesLosses) * 0.08) : materialRoll >= 17 ? -Math.round(Math.max(100, materialPurchasesLosses) * 0.04) : 0;
  const genericShopCosts = Math.max(0, state.profile.genericShopCostsGp + materialAdjustment + Math.max(0, materialWaste));
  const demand = targetedShopDemand(state, effective, eventSalesModifier, shopRoll, Math.max(0, materialWaste));
  const sold = sellInventory(nextInventory, demand);
  nextInventory = sold.inventory;
  const genericShopProfit = sold.shopSales + ambientShopSales(sold.unmetDemand);
  const totalNetProfit = recognizedCommissionProfit + genericShopProfit + repairMiscProfit - genericShopCosts;
  const reputationChange = boundedReputationChange(rawReputationChange);
  const endingReputation = Math.max(0, Math.min(state.profile.maxReputation, state.profile.reputation + reputationChange));

  cards.push({
    id: "shop-sales",
    title: "Walk-Ins and Shop Sales",
    actorOrSystem: "Shop",
    roll: shopRoll,
    flavorText: "Customers drift through the Mermaid's lower rooms and leave with buckles, shields, and stories.",
    mechanicalEffectText: `${genericShopProfit.toLocaleString()} gp shop income; ${sold.shopSales.toLocaleString()} gp from tracked stock.`,
    effectTags: ["sales"],
  });
  cards.push({
    id: "material-management",
    title: "Material Management",
    actorOrSystem: "Taark",
    roll: materialRoll,
    flavorText: "Rare ingots, offcuts, and tempering choices decide how costly the month feels.",
    mechanicalEffectText: `${materialWaste >= 0 ? materialWaste.toLocaleString() : Math.abs(materialWaste).toLocaleString()} gp ${materialWaste >= 0 ? "waste" : "savings"}; material cost modifier ${materialCostModifierPct}%.`,
    effectTags: ["materials"],
  });

  const targetStockDeficitsRemaining = nextInventory
    .map((stock) => ({ itemName: stock.item.name, deficit: Math.max(0, stock.target - stock.quantity) }))
    .filter((row) => row.deficit > 0);
  const report: MonthlyResolutionReport = {
    grossCommissionProjectValue,
    controlledRecognizedCommissionProfit: recognizedCommissionProfit,
    genericShopProfit,
    repairMiscProfit,
    genericShopCosts,
    materialPurchasesLosses: materialPurchasesLosses + materialAdjustment + materialWaste,
    totalNetProfit,
    totalAvailableHours: effective.available,
    commissionProjectHours: effective.commissionWorkHours,
    genericInventoryHours: effective.genericShopWorkHours,
    repairWalkInHours: effective.repairsWalkinsHours,
    jordyTrainingHours: effective.jordyTrainingHours,
    projectReports,
    itemsProduced: production.itemsProduced,
    itemsSold: sold.itemsSold,
    targetStockDeficitsRemaining,
    unmetDemand: sold.unmetDemand,
    inventoryAfter: nextInventory,
    materialsBefore: cloneMaterials(state.materials),
    materialsAfter: cloneMaterials(nextMaterials),
    startingReputation: state.profile.reputation,
    reputationChange,
    endingReputation,
    eventLog,
  };

  for (const card of [
    ["generic-costs", "Generic Shop Costs", `${genericShopCosts.toLocaleString()} gp in costs.`],
    ["inventory-materials", "Inventory and Materials Update", `${report.itemsProduced.length} item groups produced; ${report.itemsSold.length} item groups sold.`],
    ["reputation", "Reputation Update", `${state.profile.reputation} -> ${endingReputation}.`],
    ["final-net", "Final Monthly Net", `${totalNetProfit.toLocaleString()} gp net.`],
  ] as Array<[string, string, string]>) {
    cards.push({
      id: card[0],
      title: card[1],
      actorOrSystem: "Ledger",
      flavorText: "The month settles into the book.",
      mechanicalEffectText: card[2],
      effectTags: ["ledger"],
    });
  }

  const simulation: MonthlyResolutionSimulation = {
    id: `simulation-${state.currentMonth}-${Date.now()}`,
    monthLabel: state.monthLabel,
    generatedAt: new Date().toISOString(),
    events,
    cards,
    report,
    forecast,
    nextState: state,
  };
  simulation.nextState = applyMonthlySimulation(state, simulation);
  return simulation;
}

export function applyMonthlySimulation(state: CampaignState, simulation: MonthlyResolutionSimulation): CampaignState {
  const nextMonth = state.currentMonth + 1;
  const report = simulation.report;
  const projectReportsById = new Map(report.projectReports.map((project) => [project.projectId, project]));
  const projects = state.projects.map((project) => {
    const projectReport = projectReportsById.get(project.id);
    if (!projectReport) return project;
    return {
      ...project,
      hoursInvested: projectReport.hoursAfter,
      status: projectReport.completedThisMonth ? "completed" as const : "in_progress" as const,
      draftRoll: undefined,
    };
  });
  const completedProjects = report.projectReports.filter((project) => project.completedThisMonth).map((project) => project.name);
  const forecast = ledgerForecastFromSimulation(simulation);
  const result: ResolutionResult = {
    availableLabor: report.totalAvailableHours,
    usedLabor: report.commissionProjectHours + report.genericInventoryHours + report.repairWalkInHours + report.jordyTrainingHours,
    grossCashReceived: report.grossCommissionProjectValue,
    materialReimbursement: 0,
    recognizedProjectProfit: report.controlledRecognizedCommissionProfit,
    shopSales: report.genericShopProfit,
    genericShopCosts: report.genericShopCosts,
    materialSavings: Math.max(0, -report.materialPurchasesLosses),
    recognizedMaterialBurden: report.projectReports.reduce((total, project) => total + project.recognizedMaterialBurden, 0),
    physicalMaterialCost: report.materialPurchasesLosses,
    netProfit: report.totalNetProfit,
    reputationDelta: report.reputationChange,
    completedProjects,
    projectReports: [],
    outcomes: report.projectReports.map((project) => ({
      projectId: project.projectId,
      projectName: project.name,
      roll: project.craftingRoll,
      total: project.craftingRoll,
      dc: 0,
      margin: 0,
      outcome: project.completedThisMonth ? "Normal" : "Delay",
    })),
    forecast,
    notes: report.eventLog,
  };

  return {
    ...state,
    currentMonth: nextMonth,
    monthLabel: `Month ${nextMonth}`,
    profile: {
      ...state.profile,
      reputation: report.endingReputation,
    },
    materials: report.materialsAfter,
    inventory: report.inventoryAfter,
    projects,
    events: generateMonthlyEvents(nextMonth, state.settings.randomSeed),
    labor: {
      projectHours: Object.fromEntries(projects.map((project) => [project.id, 0])),
      genericInventory: 80,
      repairs: 40,
      apprenticeTraining: 24,
      miscellaneous: 20,
    },
    ledger: [
      {
        id: `ledger-${state.currentMonth}`,
        monthLabel: state.monthLabel,
        grossCashReceived: report.grossCommissionProjectValue,
        materialReimbursement: 0,
        recognizedProjectProfit: report.controlledRecognizedCommissionProfit,
        shopSales: report.genericShopProfit,
        genericShopCosts: report.genericShopCosts,
        materialSavings: result.materialSavings,
        recognizedMaterialBurden: result.recognizedMaterialBurden,
        physicalMaterialCost: report.materialPurchasesLosses,
        netProfit: report.totalNetProfit,
        reputationDelta: report.reputationChange,
        completedProjects,
        projectReports: [],
        forecast,
        notes: report.eventLog,
      },
      ...state.ledger,
    ],
    lastResolution: result,
  };
}

export function undoLastAppliedMonth(snapshot: CampaignState | null): CampaignState | null {
  return snapshot;
}

export function forecastProjects(state: CampaignState): ForecastBreakdown {
  const active = state.projects.filter((project) => project.status === "queued" || project.status === "in_progress");
  const projectFinancials = active.map((project) =>
    calculateProjectFinancials(project, state.materials, state.profile.commissionAnchorGp, state.profile.commissionSpikeCapGp),
  );
  const paidCommissionProfit = projectFinancials
    .filter((report) => report.economicMode === "profit_bearing" || report.economicMode === "dm_override")
    .reduce((total, report) => total + report.recognizedProfit, 0);
  const nonprofitPrestigeHours = active
    .filter((project) => project.economicMode === "reputation_only" || project.economicMode === "no_revenue")
    .reduce((total, project) => total + project.hoursInvested, 0);
  const internalInvestmentCost = projectFinancials
    .filter((report) => report.economicMode === "internal_asset")
    .reduce((total, report) => total + report.unreimbursedMaterialCost + report.trueSpecialExpenses, 0);
  const materialRiskCost = projectFinancials.reduce((total, report) => total + report.unreimbursedMaterialCost, 0);
  const warnings: string[] = [];
  if (materialRiskCost > state.profile.dmTargetProfitGp + state.profile.dmTargetVolatilityGp) {
    warnings.push(
      `Warning: plan carries ${Math.round(materialRiskCost).toLocaleString()} gp in unreimbursed material risk outside the intended monthly range.`,
    );
  }

  return {
    paidCommissionProfit,
    nonprofitPrestigeHours,
    internalInvestmentCost,
    inventoryProductionHours: state.labor.genericInventory,
    shopSales: state.profile.shopProfitBaselineGp,
    materialRisk: materialRiskCost > 3000 ? "High" : materialRiskCost > 1000 ? "Moderate" : "Low",
    warnings,
  };
}

export function resolveMonth(state: CampaignState): { state: CampaignState; result: ResolutionResult } {
  const modifier = summarizeModifiers(state.events);
  const laborAvailable = availableLabor(state);
  const laborSpent = Math.min(usedLabor(state.labor), laborAvailable);
  const notes: string[] = [];
  const outcomes: ResolutionResult["outcomes"] = [];
  const completedProjects: string[] = [];
  const projectReports: ProjectFinancials[] = [];
  let reputationDelta = modifier.reputation + modifier.prestige;
  let nextMaterials = { ...state.materials };

  const projects = state.projects.map((project) => {
    if (project.status !== "queued" && project.status !== "in_progress") return project;

    const requirements = getProjectRequirements(project);
    const assignedHours = Math.max(0, state.labor.projectHours[project.id] || 0);
    const hoursInvested = Math.min(requirements.hours, project.hoursInvested + assignedHours);

    if (hoursInvested < requirements.hours) {
      return { ...project, hoursInvested, status: "in_progress" as const };
    }

    const roll = project.draftRoll ?? rollDie(`${state.settings.randomSeed}:${state.currentMonth}:${project.id}`);
    const total = roll + state.profile.skills[project.item.category] + state.profile.forgeBonus + state.profile.toolBonus;
    const margin = total - requirements.dc;
    const outcome = outcomeFromMargin(margin);

    outcomes.push({
      projectId: project.id,
      projectName: project.name,
      roll,
      total,
      dc: requirements.dc,
      margin,
      outcome,
    });

    if (outcome === "Delay") {
      notes.push(`${project.name} needs another pass before delivery.`);
      return { ...project, hoursInvested: Math.max(requirements.hours - 8, 0), status: "in_progress" as const };
    }

    if (outcome === "Material Loss") {
      notes.push(`${project.name} suffers material loss and must be recovered next month.`);
      nextMaterials = consumeProjectMaterials(nextMaterials, project);
      return { ...project, hoursInvested: Math.max(requirements.hours - 16, 0), status: "in_progress" as const };
    }

    const completed = { ...project, hoursInvested: requirements.hours, status: "completed" as const };
    const report = calculateProjectFinancials(
      completed,
      nextMaterials,
      state.profile.commissionAnchorGp,
      state.profile.commissionSpikeCapGp,
    );
    projectReports.push(report);
    completedProjects.push(project.name);
    reputationDelta += project.reputationEffectOnCompletion + project.prestige + (outcome === "Exceptional" ? 1 : 0);
    nextMaterials = consumeProjectMaterials(nextMaterials, completed);
    if (report.createsInternalAsset) {
      notes.push(`${report.createsInternalAsset.assetName} created: ${report.createsInternalAsset.futureEffectText}`);
    }
    notes.push(...report.reportLines);

    return completed;
  });

  const replenished = replenishInventory(state.inventory, nextMaterials, state.labor.genericInventory);
  nextMaterials = replenished.materials;
  notes.push(...replenished.notes);

  const repairsIncome = Math.round(Math.max(0, state.labor.repairs || 0) * 7);
  const trainingBoost = state.labor.apprenticeTraining >= 40 ? 1 : 0;
  reputationDelta += trainingBoost;
  const materialSavings = Math.round(
    state.profile.genericShopCostsGp * (Math.max(0, Math.min(50, modifier.materialDiscountPct)) / 100),
  );
  if (materialSavings > 0) {
    notes.push(`Riff's procurement work trims ${materialSavings.toLocaleString()} gp from Generic Shop Costs.`);
  }

  const shopSales = Math.max(
    0,
    Math.round(
      state.profile.shopProfitBaselineGp +
        modifier.shopSalesGp +
        state.profile.reputation * 35 +
        repairsIncome,
    ),
  );
  const genericShopCosts = Math.max(0, state.profile.genericShopCostsGp - materialSavings);
  const grossCashReceived = projectReports.reduce((total, report) => total + report.grossCashReceived, 0);
  const materialReimbursement = projectReports.reduce((total, report) => total + report.materialReimbursement, 0);
  const recognizedProjectProfit = projectReports.reduce((total, report) => total + report.recognizedProfit, 0);
  const recognizedMaterialBurden = projectReports.reduce((total, report) => total + report.recognizedMaterialBurden, 0);
  const physicalMaterialCost = projectReports.reduce((total, report) => total + report.trueMaterialCost, 0);
  const netProjectImpact = projectReports.reduce((total, report) => total + report.netCashImpact, 0);
  const netProfit = netProjectImpact + shopSales - genericShopCosts;
  const forecast = forecastProjects({ ...state, projects });

  const result: ResolutionResult = {
    availableLabor: laborAvailable,
    usedLabor: laborSpent,
    grossCashReceived,
    materialReimbursement,
    recognizedProjectProfit,
    shopSales,
    genericShopCosts,
    materialSavings,
    recognizedMaterialBurden,
    physicalMaterialCost,
    netProfit,
    reputationDelta,
    completedProjects,
    projectReports,
    outcomes,
    forecast,
    notes,
  };

  const nextMonth = state.currentMonth + 1;
  const nextState: CampaignState = {
    ...state,
    currentMonth: nextMonth,
    monthLabel: `Month ${nextMonth}`,
    profile: {
      ...state.profile,
      reputation: Math.max(0, Math.min(state.profile.maxReputation, state.profile.reputation + reputationDelta)),
    },
    materials: nextMaterials,
    inventory: replenished.inventory,
    projects,
    events: generateMonthlyEvents(nextMonth, state.settings.randomSeed),
    labor: {
      projectHours: Object.fromEntries(projects.map((project) => [project.id, 0])),
      genericInventory: 80,
      repairs: 40,
      apprenticeTraining: 24,
      miscellaneous: 20,
    },
    ledger: [
      {
        id: `ledger-${state.currentMonth}`,
        monthLabel: state.monthLabel,
        grossCashReceived,
        materialReimbursement,
        recognizedProjectProfit,
        shopSales,
        genericShopCosts,
        materialSavings,
        recognizedMaterialBurden,
        physicalMaterialCost,
        netProfit,
        reputationDelta,
        completedProjects,
        projectReports,
        forecast,
        notes,
      },
      ...state.ledger,
    ],
    lastResolution: result,
  };

  return { state: nextState, result };
}

export function clampLabor(state: CampaignState, labor: LaborAllocation): LaborAllocation {
  const laborAvailable = availableLabor(state);
  const currentUsed = usedLabor(labor);
  if (currentUsed <= laborAvailable) return labor;

  const scale = laborAvailable / currentUsed;
  return {
    projectHours: Object.fromEntries(
      Object.entries(labor.projectHours).map(([id, hours]) => [id, Math.floor(Math.max(0, hours) * scale)]),
    ),
    genericInventory: Math.floor(Math.max(0, labor.genericInventory) * scale),
    repairs: Math.floor(Math.max(0, labor.repairs) * scale),
    apprenticeTraining: Math.floor(Math.max(0, labor.apprenticeTraining) * scale),
    miscellaneous: Math.floor(Math.max(0, labor.miscellaneous) * scale),
  };
}

export function materialStockToInventory(stock: Record<MaterialName, number>): MaterialInventory {
  return Object.fromEntries(
    (Object.entries(stock) as Array<[MaterialName, number]>).map(([material, lbs]) => [
      material,
      { lbs, gpPerLb: defaultMaterialCosts[material] },
    ]),
  ) as MaterialInventory;
}

function priorityFromLegacy(priority: "High" | "Medium" | "Low"): Priority {
  if (priority === "High") return "high";
  if (priority === "Low") return "low";
  return "medium";
}

export function migrateLegacyCampaignState(legacy: LegacyCampaignState): CampaignState {
  const materials = materialStockToInventory(legacy.materials);
  const projects = legacy.commissions.map((commission): ForgeProject => {
    const isBasenhack = commission.id.includes("basenhack");
    const isFairstream = commission.id.includes("fairstream");
    const isPurple = commission.id.includes("purple");
    const materialSupplyMode = isFairstream ? "client_reimburses" : "taark_supplies";
    const economicMode: ProjectEconomicMode = isFairstream ? "profit_bearing" : "reputation_only";
    const materialsRows = materialRowsFromRecipe(commission.item.materialRecipe, "taark", materialSupplyMode === "client_reimburses");
    const materialCostValue = materialsRows.reduce((total, row) => total + materialCost(materials, row), 0);
    return {
      id: commission.id,
      name: commission.item.name,
      client: commission.client,
      kind: isBasenhack ? "contest_prize" : isPurple ? "prestige_commission" : "paid_commission",
      economicMode,
      materialSupplyMode,
      payoutMode: isFairstream ? "materials_plus_labor" : "no_payment",
      item: commission.item,
      itemType: commission.item.name,
      status:
        commission.status === "completed" ? "completed" : commission.status === "paused" ? "queued" : "in_progress",
      priority: priorityFromLegacy(commission.priority),
      trueContractValue: commission.rewardGp,
      listedItemValue: commission.item.basePriceGp,
      materialCost: materialCostValue,
      specialExpenses: 0,
      laborFee: Math.max(0, commission.rewardGp - materialCostValue),
      trueMargin: Math.max(0, commission.rewardGp - materialCostValue),
      requiredHours: commission.requiredHours,
      hoursInvested: commission.progressHours,
      craftDc: commission.craftDc,
      prestige: commission.prestige,
      reputationEffectOnCompletion: commission.prestige,
      materials: materialsRows,
      notes: commission.notes,
      resolutionMode: commission.resolutionMode,
      draftRoll: commission.draftRoll,
    };
  });

  return {
    ...legacy,
    version: 2,
    profile: {
      ...legacy.profile,
      name: legacy.profile.name.replace("Tark", "Taark"),
      title: legacy.profile.title.replace("Tark", "Taark"),
      genericShopCostsGp: legacy.profile.monthlyExpenseGp,
      commissionAnchorGp: 1400,
      commissionSpikeCapGp: 1000,
      dmTargetProfitGp: 2000,
      dmTargetVolatilityGp: 1000,
    },
    materials,
    projects,
    labor: {
      projectHours: legacy.labor.commissionHours,
      genericInventory: legacy.labor.genericInventory,
      repairs: legacy.labor.repairs,
      apprenticeTraining: legacy.labor.apprenticeTraining,
      miscellaneous: legacy.labor.miscellaneous,
    },
    settings: {
      ...legacy.settings,
      materialBalancingMode: "profit_coupled",
    },
    ledger: [],
    lastResolution: undefined,
  };
}

export function normalizeCampaignState(value: unknown): CampaignState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { version?: number; projects?: unknown; commissions?: unknown };
  if (candidate.version === 2 && Array.isArray(candidate.projects)) {
    return rebalanceCampaignDefaults(value as CampaignState);
  }
  if (candidate.version === 1 && Array.isArray(candidate.commissions)) {
    return rebalanceCampaignDefaults(migrateLegacyCampaignState(value as LegacyCampaignState));
  }
  return null;
}

function rebalanceCampaignDefaults(state: CampaignState): CampaignState {
  const genericShopCostsGp =
    state.profile.genericShopCostsGp >= 500
      ? Math.max(100, Math.round(state.profile.genericShopCostsGp / 10))
      : state.profile.genericShopCostsGp;
  const shopProfitBaselineGp = state.profile.shopProfitBaselineGp === 2000 ? 1700 : state.profile.shopProfitBaselineGp;

  return {
    ...state,
    profile: {
      ...state.profile,
      genericShopCostsGp,
      shopProfitBaselineGp,
      dmTargetProfitGp: state.profile.dmTargetProfitGp || 2000,
      dmTargetVolatilityGp: state.profile.dmTargetVolatilityGp || 1000,
    },
  };
}

export const projectTemplates: Record<ProjectTemplateName, Pick<ForgeProject, "kind" | "economicMode" | "materialSupplyMode" | "payoutMode">> = {
  "Normal Paid Commission": {
    kind: "paid_commission",
    economicMode: "profit_bearing",
    materialSupplyMode: "taark_supplies",
    payoutMode: "true_contract_value",
  },
  "Client-Supplied Material Commission": {
    kind: "paid_commission",
    economicMode: "profit_bearing",
    materialSupplyMode: "client_supplies",
    payoutMode: "labor_only",
  },
  "Material-Reimbursed Commission": {
    kind: "paid_commission",
    economicMode: "profit_bearing",
    materialSupplyMode: "client_reimburses",
    payoutMode: "materials_plus_labor",
  },
  "Prestige / Reputation Job": {
    kind: "prestige_commission",
    economicMode: "reputation_only",
    materialSupplyMode: "taark_supplies",
    payoutMode: "no_payment",
  },
  "Contest Prize": {
    kind: "contest_prize",
    economicMode: "reputation_only",
    materialSupplyMode: "taark_supplies",
    payoutMode: "no_payment",
  },
  "Internal Forge or Tavern Project": {
    kind: "internal_project",
    economicMode: "internal_asset",
    materialSupplyMode: "taark_supplies",
    payoutMode: "no_payment",
  },
  "Party Gear": {
    kind: "party_project",
    economicMode: "no_revenue",
    materialSupplyMode: "taark_supplies",
    payoutMode: "no_payment",
  },
  "Generic Inventory Item": {
    kind: "speculative_inventory",
    economicMode: "profit_bearing",
    materialSupplyMode: "taark_supplies",
    payoutMode: "true_contract_value",
  },
};
