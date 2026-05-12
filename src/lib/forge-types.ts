export type MaterialName =
  | "Iron"
  | "Steel"
  | "Mithril"
  | "Adamantine"
  | "Silver"
  | "Gold";

export type Complexity =
  | "very-simple"
  | "simple"
  | "moderate"
  | "complex"
  | "very-complex";

export type SkillKey = "armorsmithing" | "weaponsmithing" | "blacksmithing";

export type ResolutionMode = "fixedHours" | "craftingPdf";

export type ProjectStatus = "queued" | "in_progress" | "completed" | "delivered" | "cancelled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type ForgeProjectKind =
  | "paid_commission"
  | "prestige_commission"
  | "contest_prize"
  | "internal_project"
  | "party_project"
  | "speculative_inventory"
  | "repair_job";

export type ProjectEconomicMode =
  | "profit_bearing"
  | "break_even"
  | "no_revenue"
  | "reputation_only"
  | "internal_asset"
  | "dm_override";

export type MaterialSupplyMode =
  | "taark_supplies"
  | "client_supplies"
  | "mixed"
  | "client_reimburses"
  | "no_material_cost";

export type MaterialBalancingMode = "strict_physical" | "profit_coupled" | "dm_override";

export type PayoutMode =
  | "no_payment"
  | "materials_only"
  | "labor_only"
  | "materials_plus_labor"
  | "true_contract_value"
  | "dm_fixed_amount";

export type EventSource =
  | "Valthen"
  | "Tyrande"
  | "Stigandur"
  | "Riff"
  | "Galanthir"
  | "Guild"
  | "City"
  | "Jordy";

export type Outcome = "Exceptional" | "Excellent" | "Normal" | "Delay" | "Material Loss";

export type MaterialStock = Record<MaterialName, number>;

export type MaterialRequirement = Partial<Record<MaterialName, number>>;

export type MaterialInventory = Record<MaterialName, { lbs: number; gpPerLb: number }>;

export interface ForgeProfile {
  name: string;
  title: string;
  reputation: number;
  maxReputation: number;
  skills: Record<SkillKey, number>;
  forgeQuality: string;
  toolQuality: string;
  forgeBonus: number;
  toolBonus: number;
  baseMonthlyHours: number;
  ringOfSustenanceHours: number;
  genericShopCostsGp: number;
  shopProfitBaselineGp: number;
  commissionAnchorGp: number;
  commissionSpikeCapGp: number;
  dmTargetProfitGp: number;
  dmTargetVolatilityGp: number;
}

export interface ForgeItem {
  name: string;
  category: SkillKey;
  complexity: Complexity;
  basePriceGp: number;
  masterwork: boolean;
  specialMaterial?: MaterialName;
  materialRecipe: MaterialRequirement;
}

export interface ProjectMaterial {
  material: MaterialName;
  lbs: number;
  suppliedBy: "taark" | "client";
  reimbursed: boolean;
  costPerLb?: number;
}

export interface InternalAsset {
  assetName: string;
  assetType: "security" | "forge_upgrade" | "tavern_upgrade" | "storage" | "defense" | "other";
  futureEffectText: string;
  mechanicalEffect?: {
    genericShopCostModifier?: number;
    securityModifier?: number;
    reputationModifier?: number;
    futureEventModifier?: number;
  };
}

export interface ForgeProject {
  id: string;
  name: string;
  client?: string;
  kind: ForgeProjectKind;
  economicMode: ProjectEconomicMode;
  materialSupplyMode: MaterialSupplyMode;
  payoutMode: PayoutMode;
  item: ForgeItem;
  itemType: string;
  status: ProjectStatus;
  priority: Priority;
  trueContractValue: number;
  listedItemValue: number;
  materialCost: number;
  specialExpenses: number;
  laborFee: number;
  trueMargin: number;
  dmFixedPayout?: number;
  requiredHours: number;
  hoursInvested: number;
  craftDc: number;
  prestige: number;
  reputationEffectOnCompletion: number;
  deadline?: string;
  materials: ProjectMaterial[];
  depositPaid?: number;
  materialReimbursementPaid?: number;
  finalPaymentDue?: number;
  createsInternalAsset?: InternalAsset;
  notes?: string;
  resolutionMode: ResolutionMode;
  draftRoll?: number;
}

export type ProjectTemplateName =
  | "Normal Paid Commission"
  | "Client-Supplied Material Commission"
  | "Material-Reimbursed Commission"
  | "Prestige / Reputation Job"
  | "Contest Prize"
  | "Internal Forge or Tavern Project"
  | "Party Gear"
  | "Generic Inventory Item";

export interface ProjectMaterialAccounting {
  physicalMaterialsConsumed: Array<{
    material: MaterialName;
    lbs: number;
    gpEquivalent: number;
  }>;
  recognizedMaterialsConsumed: Array<{
    material: MaterialName;
    lbsEquivalent: number;
    gpEquivalent: number;
  }>;
  unrecognizedMaterialBalance: Array<{
    material: MaterialName;
    lbsEquivalent: number;
    gpEquivalent: number;
    note: string;
  }>;
}

export interface ProjectFinancials {
  projectId: string;
  projectName: string;
  kind: ForgeProjectKind;
  economicMode: ProjectEconomicMode;
  materialSupplyMode: MaterialSupplyMode;
  payoutMode: PayoutMode;
  trueProjectValue: number;
  trueMaterialCost: number;
  trueSpecialExpenses: number;
  trueMargin: number;
  grossCashReceived: number;
  materialReimbursement: number;
  recognizedProfit: number;
  recognizedRevenue: number;
  recognizedMaterialBurden: number;
  recognizedSpecialExpenses: number;
  unreimbursedMaterialCost: number;
  netCashImpact: number;
  recognitionRatio: number;
  opportunityCost: number;
  materialAccounting: ProjectMaterialAccounting;
  createsInternalAsset?: InternalAsset;
  reportLines: string[];
}

export interface InventoryItem {
  id: string;
  item: ForgeItem;
  quantity: number;
  target: number;
}

export interface EventModifier {
  laborHours?: number;
  shopSalesGp?: number;
  reputation?: number;
  materialDiscountPct?: number;
  prestige?: number;
}

export interface MonthlyEvent {
  id: string;
  source: EventSource;
  title: string;
  flavorText: string;
  modifier: EventModifier;
  visibleAtTable: boolean;
  locked: boolean;
}

export interface LaborAllocation {
  projectHours: Record<string, number>;
  genericInventory: number;
  repairs: number;
  apprenticeTraining: number;
  miscellaneous: number;
}

export interface ForecastBreakdown {
  paidCommissionProfit: number;
  nonprofitPrestigeHours: number;
  internalInvestmentCost: number;
  inventoryProductionHours: number;
  shopSales: number;
  materialRisk: "Low" | "Moderate" | "High";
  warnings: string[];
}

export interface LedgerEntry {
  id: string;
  monthLabel: string;
  grossCashReceived: number;
  materialReimbursement: number;
  recognizedProjectProfit: number;
  shopSales: number;
  genericShopCosts: number;
  materialSavings: number;
  recognizedMaterialBurden: number;
  physicalMaterialCost: number;
  netProfit: number;
  reputationDelta: number;
  completedProjects: string[];
  projectReports: ProjectFinancials[];
  forecast: ForecastBreakdown;
  notes: string[];
}

export interface ResolutionResult {
  availableLabor: number;
  usedLabor: number;
  grossCashReceived: number;
  materialReimbursement: number;
  recognizedProjectProfit: number;
  shopSales: number;
  genericShopCosts: number;
  materialSavings: number;
  recognizedMaterialBurden: number;
  physicalMaterialCost: number;
  netProfit: number;
  reputationDelta: number;
  completedProjects: string[];
  projectReports: ProjectFinancials[];
  outcomes: Array<{
    projectId: string;
    projectName: string;
    roll: number;
    total: number;
    dc: number;
    margin: number;
    outcome: Outcome;
  }>;
  forecast: ForecastBreakdown;
  notes: string[];
}

export type MonthlyResolutionStage =
  | "planning"
  | "forecast"
  | "rolls"
  | "playback"
  | "ledger";

export type EventActor =
  | "Tyrande"
  | "Riff"
  | "Stigandur"
  | "Galenthyr"
  | "Valthen"
  | "Jordy"
  | "Guild"
  | "City";

export type MonthlyEventTarget = "commission" | "shop" | "inventory" | "materials" | "global";

export interface MonthlyEventEffect {
  hoursDelta: number;
  moneyDelta: number;
  volatilityDelta: number;
  target: MonthlyEventTarget;
}

export type CraftQuality =
  | "natural_20"
  | "exceptional"
  | "excellent"
  | "success"
  | "minor_failure"
  | "bad_failure";

export interface ProjectMonthlyPlan {
  projectId: string;
  selected: boolean;
  allocatedHours: number;
  nominalHours: number;
  protectedHours: number;
  bufferHours: number;
  fundingStatus: "unfunded" | "partial" | "funded" | "buffered";
}

export interface MonthlyHourInputs {
  baseHours: number;
  ringOfSustenanceBonus: number;
  workaholicBonus: number;
  eventHourModifier: number;
  totalAvailableHours: number;
}

export interface MonthlyWorkAllocation {
  commissionWorkHours: number;
  genericShopWorkHours: number;
  repairsWalkinsHours: number;
  jordyTrainingHours: number;
}

export interface TaarkMonthlyRolls {
  shopSales?: number;
  genericInventoryReplenishment?: number;
  materialManagement?: number;
}

export interface ProjectCraftingRoll {
  projectId: string;
  roll?: number;
}

export interface EventResolution {
  actor: EventActor;
  roll: number;
  strength: number;
  title: string;
  flavorText: string;
  band: "catastrophic" | "bad" | "setback" | "neutral" | "good" | "strong_good" | "exceptional";
  effects: MonthlyEventEffect;
}

export interface ForecastResult {
  expectedTotalProfit: number;
  profitSigma: number;
  profitP10: number;
  profitP50: number;
  profitP90: number;
  expectedCommissionProfit: number;
  expectedGenericShopProfit: number;
  expectedRepairMiscProfit: number;
  probabilityEachProjectCompletes: Record<string, number>;
  probabilityEachProjectExcellentOrBetter: Record<string, number>;
  probabilityAnyMaterialShortage: number;
  probabilityInventoryDemandExceedsStock: number;
  probabilityNegativeProfit: number;
  expectedItemsSold: Array<{
    itemName: string;
    expectedQuantitySold: number;
  }>;
  expectedInventoryDeficitsAfterMonth: Array<{
    itemName: string;
    expectedDeficit: number;
  }>;
  warnings: string[];
  recommendations: string[];
}

export interface ResolutionCard {
  id: string;
  title: string;
  subtitle?: string;
  actorOrSystem: string;
  roll?: number;
  flavorText: string;
  mechanicalEffectText: string;
  effectTags: string[];
}

export interface ProjectResolutionReport {
  projectId: string;
  name: string;
  kind: ForgeProjectKind;
  client?: string;
  hoursBefore: number;
  hoursAdded: number;
  hoursAfter: number;
  requiredHours: number;
  progressPercentage: number;
  craftingRoll: number;
  craftingTotal: number;
  craftDc: number;
  quality: CraftQuality;
  completedThisMonth: boolean;
  recognizedProfit: number;
  physicalMaterialsConsumed: ProjectFinancials["materialAccounting"]["physicalMaterialsConsumed"];
  recognizedMaterialBurden: number;
  reputationPrestigeEffect: number;
}

export interface MonthlyResolutionReport {
  grossCommissionProjectValue: number;
  controlledRecognizedCommissionProfit: number;
  genericShopProfit: number;
  repairMiscProfit: number;
  genericShopCosts: number;
  materialPurchasesLosses: number;
  totalNetProfit: number;
  totalAvailableHours: number;
  commissionProjectHours: number;
  genericInventoryHours: number;
  repairWalkInHours: number;
  jordyTrainingHours: number;
  projectReports: ProjectResolutionReport[];
  itemsProduced: Array<{ itemName: string; quantity: number }>;
  itemsSold: Array<{ itemName: string; quantity: number; gp: number }>;
  targetStockDeficitsRemaining: Array<{ itemName: string; deficit: number }>;
  unmetDemand: number;
  inventoryAfter: InventoryItem[];
  materialsBefore: MaterialInventory;
  materialsAfter: MaterialInventory;
  startingReputation: number;
  reputationChange: number;
  endingReputation: number;
  eventLog: string[];
}

export interface MonthlyResolutionSimulation {
  id: string;
  monthLabel: string;
  generatedAt: string;
  events: EventResolution[];
  cards: ResolutionCard[];
  report: MonthlyResolutionReport;
  forecast: ForecastResult;
  nextState: CampaignState;
}

export interface MonthlyResolutionDraft {
  version: 1;
  month: number;
  stage: MonthlyResolutionStage;
  hourInputs: MonthlyHourInputs;
  allocation: MonthlyWorkAllocation;
  projectPlans: ProjectMonthlyPlan[];
  eventRolls: Partial<Record<EventActor, number>>;
  taarkRolls: TaarkMonthlyRolls;
  projectRolls: ProjectCraftingRoll[];
  forecast?: ForecastResult;
  simulation?: MonthlyResolutionSimulation;
  playback: {
    cardIndex: number;
    autoplay: boolean;
    speed: "slow" | "normal" | "fast";
  };
  warnings: string[];
}

export interface SharedCampaignDocument {
  state: CampaignState;
  draft: MonthlyResolutionDraft;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

export interface CampaignSaveRequest {
  state: CampaignState;
  draft: MonthlyResolutionDraft;
  ifRevision?: number;
  overwrite?: boolean;
  updatedBy?: string;
}

export interface CampaignSettings {
  tableFacing: boolean;
  resolutionStyle: "dm-editable";
  craftingDefault: ResolutionMode;
  randomSeed: string;
  materialBalancingMode: MaterialBalancingMode;
}

export interface CampaignState {
  version: 2;
  currentMonth: number;
  monthLabel: string;
  profile: ForgeProfile;
  materials: MaterialInventory;
  inventory: InventoryItem[];
  projects: ForgeProject[];
  events: MonthlyEvent[];
  labor: LaborAllocation;
  ledger: LedgerEntry[];
  settings: CampaignSettings;
  lastResolution?: ResolutionResult;
}

export type LegacyCampaignState = Omit<CampaignState, "version" | "profile" | "materials" | "projects" | "labor" | "settings"> & {
  version: 1;
  profile: Omit<
    ForgeProfile,
    "genericShopCostsGp" | "commissionAnchorGp" | "commissionSpikeCapGp" | "dmTargetProfitGp" | "dmTargetVolatilityGp"
  > & {
    monthlyExpenseGp: number;
  };
  materials: MaterialStock;
  commissions: Array<{
    id: string;
    client: string;
    item: ForgeItem;
    priority: "High" | "Medium" | "Low";
    status: "active" | "completed" | "paused";
    progressHours: number;
    requiredHours: number;
    craftDc: number;
    rewardGp: number;
    prestige: number;
    notes: string;
    resolutionMode: ResolutionMode;
    draftRoll?: number;
  }>;
  labor: {
    commissionHours: Record<string, number>;
    genericInventory: number;
    repairs: number;
    apprenticeTraining: number;
    miscellaneous: number;
  };
  settings: Omit<CampaignSettings, "materialBalancingMode">;
};
