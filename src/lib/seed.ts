import { campaignCalendarLabel, defaultMaterialCosts, deriveCraftingStats, generateMonthlyEvents, materialRowsFromRecipe, materialStockToInventory } from "./forge-engine";
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

const blacksmithing = (
  name: string,
  basePriceGp: number,
  materialRecipe: ForgeItem["materialRecipe"],
  options: Partial<ForgeItem> = {},
): ForgeItem => ({
  name,
  category: "blacksmithing",
  complexity: "complex",
  basePriceGp,
  masterwork: false,
  materialRecipe,
  ...options,
});

const finesmithing = (
  name: string,
  basePriceGp: number,
  materialRecipe: ForgeItem["materialRecipe"],
  options: Partial<ForgeItem> = {},
): ForgeItem => ({
  name,
  category: "finesmithing",
  complexity: "simple",
  basePriceGp,
  masterwork: true,
  materialRecipe,
  ...options,
});

const locksmithing = (
  name: string,
  basePriceGp: number,
  materialRecipe: ForgeItem["materialRecipe"],
  options: Partial<ForgeItem> = {},
): ForgeItem => ({
  name,
  category: "locksmithing",
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
    Partial<Pick<ForgeProject, "hoursInvested" | "requiredHours" | "craftDc" | "kind" | "economicMode" | "materialSupplyMode" | "payoutMode">>,
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
    requiredHours: input.requiredHours ?? stats.hours,
    hoursInvested: input.hoursInvested ?? 0,
    craftDc: input.craftDc ?? stats.dc,
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
  Copper: 80,
  Tin: 24,
  Bronze: 90,
  Brass: 45,
  Lead: 60,
  "Cold Iron": 35,
  "Alchemical Silver": 28,
  Silver: 70,
  Electrum: 8,
  Gold: 35,
  Platinum: 4,
  Mithril: 25,
  Adamantine: 60,
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
    requiredHours: 260,
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
  project(materials, {
    id: "iron-doors-mermaid",
    client: "The Mermaid",
    item: blacksmithing("Reinforced Iron Doors", 900, { Iron: 160, Steel: 20 }),
    priority: "medium",
    trueContractValue: 1400,
    prestige: 0,
    notes: "Heavy iron door commission for the tavern/forge entryways.",
    resolutionMode: "fixedHours",
    hoursInvested: 0,
  }),
];

export const initialCampaignState: CampaignState = {
  version: 2,
  currentMonth: 1,
  monthLabel: campaignCalendarLabel(1),
  profile: {
    name: "Taark Brightaxe",
    title: "Master dwarven armorsmith beneath The Mermaid",
    reputation: 14,
    maxReputation: 20,
    skills: {
      armorsmithing: 31,
      weaponsmithing: 8,
      blacksmithing: 3,
      finesmithing: -1,
      locksmithing: 1,
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
    inventoryItem("scale-mail-mw", armor("Scale Mail (MW)", 200, { Steel: 35 }), 2, 3),
    inventoryItem("breastplate-mw", armor("Breastplate (MW)", 350, { Steel: 30 }), 2, 5),
    inventoryItem("chain-shirt-mw", armor("Chain Shirt (MW)", 250, { Steel: 25 }), 2, 5),
    inventoryItem("mithril-chain-shirt", armor("Mithril Chain Shirt", 1100, { Mithril: 12 }, { specialMaterial: "Mithril" }), 1, 2),
    inventoryItem("mithril-breastplate", armor("Mithril Breastplate", 4200, { Mithril: 18 }, { specialMaterial: "Mithril" }), 1, 2),
    inventoryItem("mithril-buckler", armor("Mithril Buckler", 1015, { Mithril: 5 }, { complexity: "moderate", specialMaterial: "Mithril" }), 0, 2),
    inventoryItem("mithril-light-shield", armor("Mithril Light Shield", 1009, { Mithril: 8 }, { complexity: "moderate", specialMaterial: "Mithril" }), 0, 2),
    inventoryItem("adamantine-breastplate", armor("Adamantine Breastplate", 6200, { Adamantine: 35, Steel: 12 }, { specialMaterial: "Adamantine" }), 0, 1),
    inventoryItem("adamantine-shield", armor("Adamantine Heavy Shield", 3020, { Adamantine: 18, Steel: 4 }, { complexity: "moderate", specialMaterial: "Adamantine" }), 0, 1),
    inventoryItem("adamantine-half-plate", armor("Adamantine Half-Plate", 10600, { Adamantine: 44, Steel: 12 }, { specialMaterial: "Adamantine" }), 0, 1),
    inventoryItem("tower-shield", armor("Tower Shield", 30, { Steel: 20 }, { complexity: "moderate", masterwork: false }), 2, 3),
    inventoryItem("heavy-steel-shield", armor("Heavy Steel Shield", 20, { Steel: 12 }, { complexity: "moderate", masterwork: false }), 3, 5),
    inventoryItem("light-steel-shield", armor("Light Steel Shield", 9, { Steel: 8 }, { complexity: "moderate", masterwork: false }), 3, 5),
    inventoryItem("buckler", armor("Buckler", 15, { Steel: 5 }, { complexity: "moderate", masterwork: false }), 4, 8),
    inventoryItem("full-plate-mw", armor("Full Plate (MW)", 1650, { Steel: 50 }), 0, 2),
    inventoryItem("half-plate-mw", armor("Half-Plate (MW)", 600, { Steel: 42 }), 0, 2),
    inventoryItem("battleaxe-mw", weapon("Battleaxe (MW)", 310, { Steel: 8 }), 1, 2),
    inventoryItem("warhammer-mw", weapon("Warhammer (MW)", 312, { Steel: 8 }), 1, 2),
    inventoryItem("longsword-mw", weapon("Longsword (MW)", 315, { Steel: 6 }), 1, 2),
    inventoryItem("dagger-mw", weapon("Dagger (MW)", 302, { Steel: 2 }), 2, 4),
    inventoryItem("handaxe-mw", weapon("Handaxe (MW)", 306, { Steel: 5 }), 0, 2),
    inventoryItem("short-sword-mw", weapon("Short Sword (MW)", 310, { Steel: 5 }), 0, 2),
    inventoryItem("mace-mw", weapon("Heavy Mace (MW)", 312, { Steel: 7 }), 0, 2),
    inventoryItem("spearheads-mw", weapon("Spearheads (MW)", 120, { Steel: 6 }, { complexity: "simple" }), 0, 4),
    inventoryItem("simple-lock-mw", locksmithing("Simple Lock (MW)", 120, { Steel: 2, Brass: 1 }), 1, 4),
    inventoryItem("good-lock-mw", locksmithing("Good Lock (MW)", 220, { Steel: 3, Brass: 1 }), 0, 3),
    inventoryItem("reinforced-lockset-mw", locksmithing("Reinforced Lockset (MW)", 360, { Steel: 6, Brass: 2 }), 0, 2),
    inventoryItem("hinges-mw", blacksmithing("Reinforced Hinges (MW)", 90, { Steel: 8 }, { complexity: "simple", masterwork: true }), 1, 4),
    inventoryItem("buckles-clasps-mw", finesmithing("Buckles and Clasps (MW)", 80, { Brass: 2, Steel: 1 }), 1, 5),
    inventoryItem("armor-fittings-mw", finesmithing("Armor Fittings (MW)", 140, { Brass: 3, Steel: 2 }), 1, 4),
    inventoryItem("lantern-frames-mw", finesmithing("Lantern Frames (MW)", 120, { Brass: 4, Copper: 1 }), 0, 3),
    inventoryItem("jewelry-fittings-mw", finesmithing("Jewelry Fittings (MW)", 180, { Silver: 1, Gold: 0.25 }), 0, 2),
  ],
  projects,
  events: generateMonthlyEvents(1, seed),
  labor: {
    projectHours: {
      "basenhack-full-plate": 160,
      "fairstream-breastplate": 110,
      "purple-worm-tooth": 80,
      "iron-doors-mermaid": 60,
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
