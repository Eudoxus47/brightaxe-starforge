import { defaultMaterialCosts, deriveCraftingStats, generateMonthlyEvents, materialRowsFromRecipe, materialStockToInventory } from "./forge-engine";
import type { CampaignState, ForgeItem, ForgeProject, InventoryItem, MaterialInventory, MaterialName } from "./forge-types";

const armor = (
  name: string,
  basePriceGp: number,
  materialRecipe: ForgeItem["materialRecipe"],
  options: Partial<ForgeItem> = {},
): ForgeItem => ({
  name,
  category: "armorsmithing",
  complexity: "complex",
  basePriceGp,
  masterwork: true,
  materialRecipe,
  ...options,
});

const weapon = (
  name: string,
  basePriceGp: number,
  materialRecipe: ForgeItem["materialRecipe"],
  options: Partial<ForgeItem> = {},
): ForgeItem => ({
  name,
  category: "weaponsmithing",
  complexity: "moderate",
  basePriceGp,
  masterwork: true,
  materialRecipe,
  ...options,
});

function recipeCost(materials: MaterialInventory, recipe: ForgeItem["materialRecipe"]): number {
  return (Object.entries(recipe) as Array<[MaterialName, number]>).reduce((total, [material, lbs]) => {
    if (lbs === undefined) return total;
    return total + lbs * (materials[material]?.gpPerLb ?? defaultMaterialCosts[material]);
  }, 0);
}

function project(
  materials: MaterialInventory,
  input: Pick<ForgeProject, "id" | "client" | "item" | "priority" | "trueContractValue" | "prestige" | "notes" | "resolutionMode"> &
    Partial<Pick<ForgeProject, "hoursInvested" | "kind" | "economicMode" | "materialSupplyMode" | "payoutMode">>,
): ForgeProject {
  const stats = deriveCraftingStats(input.item);
  const materialSupplyMode = input.materialSupplyMode ?? "taark_supplies";
  const materialCost = recipeCost(materials, input.item.materialRecipe);
  return {
    id: input.id,
    name: input.item.name,
    client: input.client,
    kind: input.kind ?? "paid_commission",
    economicMode: input.economicMode ?? "profit_bearing",
    materialSupplyMode,
    payoutMode: input.payoutMode ?? "true_contract_value",
    item: input.item,
    itemType: input.item.name,
    status: "in_progress",
    priority: input.priority,
    trueContractValue: input.trueContractValue,
    listedItemValue: input.item.basePriceGp,
    materialCost,
    specialExpenses: 0,
    laborFee: Math.max(0, input.trueContractValue - materialCost),
    trueMargin: Math.max(0, input.trueContractValue - materialCost),
    requiredHours: stats.hours,
    hoursInvested: input.hoursInvested ?? 0,
    craftDc: stats.dc,
    prestige: input.prestige,
    reputationEffectOnCompletion: input.prestige,
    materials: materialRowsFromRecipe(input.item.materialRecipe, materialSupplyMode === "client_supplies" ? "client" : "taark", materialSupplyMode === "client_reimburses"),
    notes: input.notes,
    resolutionMode: input.resolutionMode,
  };
}

const inventoryItem = (id: string, item: ForgeItem, quantity: number, target: number): InventoryItem => ({
  id,
  item,
  quantity,
  target,
});

const seed = "brightaxe-starforge";
const materials = materialStockToInventory({
  Iron: 240,
  Steel: 420,
  Mithril: 25,
  Adamantine: 60,
  Silver: 70,
  Gold: 35,
});

const projects = [
  project(materials, {
    id: "basenhack-full-plate",
    client: "Basenhack Clan",
    item: armor("Basenhack Clan Full Plate", 2300, { Steel: 55, Silver: 4 }),
    priority: "high",
    trueContractValue: 3200,
    prestige: 2,
    notes: "Elite clan commission and Taark's current primary project.",
    resolutionMode: "fixedHours",
    hoursInvested: 94,
    economicMode: "reputation_only",
    payoutMode: "no_payment",
    kind: "contest_prize",
  }),
  project(materials, {
    id: "fairstream-breastplate",
    client: "Captain Fairstream",
    item: armor("Adamantine Breastplate", 6200, { Adamantine: 35, Steel: 12 }, { specialMaterial: "Adamantine" }),
    priority: "medium",
    trueContractValue: 7600,
    prestige: 1,
    notes: "Consumes precious adamantine inventory.",
    resolutionMode: "craftingPdf",
    hoursInvested: 12,
    materialSupplyMode: "client_reimburses",
    payoutMode: "materials_plus_labor",
  }),
  project(materials, {
    id: "purple-worm-tooth",
    client: "Private Monster Hunter",
    item: weapon("Purple Worm Tooth Weapon", 1800, { Steel: 10, Silver: 2 }, { complexity: "very-complex" }),
    priority: "medium",
    trueContractValue: 2600,
    prestige: 2,
    notes: "Exotic prestige-oriented commission.",
    resolutionMode: "craftingPdf",
    hoursInvested: 0,
    economicMode: "reputation_only",
    payoutMode: "no_payment",
    kind: "prestige_commission",
  }),
];

export const initialCampaignState: CampaignState = {
  version: 2,
  currentMonth: 1,
  monthLabel: "Month 1",
  profile: {
    name: "Taark Brightaxe",
    title: "Master dwarven armorsmith beneath The Mermaid",
    reputation: 14,
    maxReputation: 20,
    skills: {
      armorsmithing: 28,
      weaponsmithing: 19,
      blacksmithing: 14,
    },
    forgeQuality: "Masterwork",
    toolQuality: "Masterwork",
    forgeBonus: 2,
    toolBonus: 2,
    baseMonthlyHours: 480,
    ringOfSustenanceHours: 120,
    genericShopCostsGp: 100,
    shopProfitBaselineGp: 1700,
    commissionAnchorGp: 1400,
    commissionSpikeCapGp: 1000,
    dmTargetProfitGp: 2000,
    dmTargetVolatilityGp: 1000,
  },
  materials,
  inventory: [
    inventoryItem("scale-mail-mw", armor("Scale Mail (MW)", 200, { Steel: 35 }), 2, 2),
    inventoryItem("breastplate-mw", armor("Breastplate (MW)", 350, { Steel: 30 }), 2, 3),
    inventoryItem("chain-shirt-mw", armor("Chain Shirt (MW)", 250, { Steel: 25 }), 2, 4),
    inventoryItem("mithril-chain-shirt", armor("Mithril Chain Shirt", 1100, { Mithril: 12 }, { specialMaterial: "Mithril" }), 1, 1),
    inventoryItem("mithril-breastplate", armor("Mithril Breastplate", 4200, { Mithril: 18 }, { specialMaterial: "Mithril" }), 1, 1),
    inventoryItem("tower-shield", armor("Tower Shield", 30, { Steel: 20 }, { complexity: "moderate", masterwork: false }), 2, 2),
    inventoryItem("heavy-steel-shield", armor("Heavy Steel Shield", 20, { Steel: 12 }, { complexity: "moderate", masterwork: false }), 3, 3),
    inventoryItem("light-steel-shield", armor("Light Steel Shield", 9, { Steel: 8 }, { complexity: "moderate", masterwork: false }), 3, 3),
    inventoryItem("buckler", armor("Buckler", 15, { Steel: 5 }, { complexity: "moderate", masterwork: false }), 4, 6),
    inventoryItem("full-plate-mw", armor("Full Plate (MW)", 1650, { Steel: 50 }), 0, 1),
  ],
  projects,
  events: generateMonthlyEvents(1, seed),
  labor: {
    projectHours: {
      "basenhack-full-plate": 160,
      "fairstream-breastplate": 110,
      "purple-worm-tooth": 80,
    },
    genericInventory: 80,
    repairs: 40,
    apprenticeTraining: 25,
    miscellaneous: 15,
  },
  ledger: [],
  settings: {
    tableFacing: true,
    resolutionStyle: "dm-editable",
    craftingDefault: "craftingPdf",
    randomSeed: seed,
    materialBalancingMode: "profit_coupled",
  },
};
