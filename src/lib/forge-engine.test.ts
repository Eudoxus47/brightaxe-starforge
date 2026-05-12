import { describe, expect, it } from "vitest";
import {
  availableLabor,
  allocateCommissionProjectHours,
  applyMonthlySimulation,
  campaignCalendarLabel,
  craftQualityFromRoll,
  createEventResolution,
  createResolutionDraft,
  deriveCraftingStats,
  eventActors,
  eventStrength,
  forecastMonthlyPlan,
  generateMonthlyEvents,
  getProjectRequirements,
  inventoryItemDisplayName,
  itemPrimaryMaterialLabel,
  itemRecipeSummary,
  normalizeCampaignState,
  outcomeFromMargin,
  progressEfficiencyFromRoll,
  resolveMonthlyDraft,
  resolveMonth,
  undoLastAppliedMonth,
  usedLabor,
  validateResolutionPlan,
} from "./forge-engine";
import type { MonthlyResolutionDraft } from "./forge-types";
import { initialCampaignState } from "./seed";

describe("crafting rules", () => {
  it("derives Crafting.pdf hours and DC from complexity, masterwork, and special material", () => {
    const stats = deriveCraftingStats({
      name: "Adamantine Breastplate",
      category: "armorsmithing",
      complexity: "complex",
      basePriceGp: 6200,
      masterwork: true,
      specialMaterial: "Adamantine",
      materialRecipe: { Adamantine: 35 },
    });

    expect(stats.hours).toBe(112);
    expect(stats.dc).toBe(28);
  });

  it("allows fixed-hour projects to override derived time", () => {
    const project = initialCampaignState.projects[0];

    expect(project.resolutionMode).toBe("fixedHours");
    expect(getProjectRequirements(project).hours).toBe(project.requiredHours);
    expect(project.hoursInvested).toBeLessThan(project.requiredHours);
  });
});

describe("monthly resolution", () => {
  it("uses seeded monthly events deterministically", () => {
    const first = generateMonthlyEvents(3, "brightaxe").map((event) => event.title);
    const second = generateMonthlyEvents(3, "brightaxe").map((event) => event.title);

    expect(first).toEqual(second);
  });

  it("calculates labor with event modifiers", () => {
    expect(availableLabor(initialCampaignState)).toBeGreaterThan(500);
    expect(usedLabor(initialCampaignState.labor)).toBeGreaterThan(0);
  });

  it("maps roll margins to outcomes", () => {
    expect(outcomeFromMargin(10)).toBe("Exceptional");
    expect(outcomeFromMargin(5)).toBe("Excellent");
    expect(outcomeFromMargin(0)).toBe("Normal");
    expect(outcomeFromMargin(-1)).toBe("Delay");
    expect(outcomeFromMargin(-5)).toBe("Material Loss");
  });

  it("finalizes a month and writes a ledger entry", () => {
    const ready = {
      ...initialCampaignState,
      projects: initialCampaignState.projects.map((project) => ({
        ...project,
        hoursInvested: getProjectRequirements(project).hours,
        draftRoll: 20,
      })),
      labor: {
        ...initialCampaignState.labor,
        projectHours: Object.fromEntries(initialCampaignState.projects.map((project) => [project.id, 0])),
      },
    };

    const { state, result } = resolveMonth(ready);

    expect(state.currentMonth).toBe(2);
    expect(state.ledger).toHaveLength(1);
    expect(result.netProfit).toBeGreaterThan(0);
    expect(result.completedProjects.length).toBeGreaterThan(0);
  });

  it("uses generic inventory hours to replenish stock and consume tracked metals", () => {
    const ready = {
      ...initialCampaignState,
      projects: initialCampaignState.projects.map((project) => ({
        ...project,
        status: "completed" as const,
      })),
      labor: {
        ...initialCampaignState.labor,
        projectHours: {},
        genericInventory: 200,
        repairs: 0,
        apprenticeTraining: 0,
        miscellaneous: 0,
      },
      inventory: initialCampaignState.inventory.map((stock) =>
        stock.id === "buckler" ? { ...stock, quantity: 4, target: 6 } : { ...stock, target: stock.quantity },
      ),
    };

    const { state } = resolveMonth(ready);
    const bucklers = state.inventory.find((stock) => stock.id === "buckler");

    expect(bucklers?.quantity).toBe(6);
    expect(state.materials.Steel.lbs).toBe(initialCampaignState.materials.Steel.lbs - 10);
  });

  it("applies material discount events to monthly expenses", () => {
    const ready = {
      ...initialCampaignState,
      events: [
        {
          id: "discount",
          source: "Riff" as const,
          title: "Discount",
          flavorText: "Riff finds cheaper fuel and fittings.",
          modifier: { materialDiscountPct: 10 },
          visibleAtTable: false,
          locked: false,
        },
      ],
    };

    const { result } = resolveMonth(ready);

    expect(result.materialSavings).toBe(10);
    expect(result.genericShopCosts).toBe(90);
  });
});

describe("staged monthly resolution", () => {
  function rolledDraft(): MonthlyResolutionDraft {
    const draft = createResolutionDraft(initialCampaignState);
    return {
      ...draft,
      eventRolls: Object.fromEntries(eventActors.map((actor) => [actor, 12])),
      taarkRolls: {
        shopSales: 13,
        genericInventoryReplenishment: 14,
        materialManagement: 15,
      },
      projectRolls: draft.projectRolls.map((entry) => ({ ...entry, roll: 16 })),
    };
  }

  it("creates a persisted planning draft with 660 default hours", () => {
    const draft = createResolutionDraft(initialCampaignState);

    expect(draft.stage).toBe("planning");
    expect(draft.hourInputs.totalAvailableHours).toBe(660);
    expect(draft.projectPlans.length).toBeGreaterThan(0);
  });

  it("uses the Elient 1374 DR campaign calendar and normalizes old month labels", () => {
    expect(campaignCalendarLabel(1)).toBe("Elient 1374 DR");
    expect(campaignCalendarLabel(2)).toBe("Marpenoth 1374 DR");
    expect(campaignCalendarLabel(5)).toBe("Hammer 1375 DR");

    const normalized = normalizeCampaignState({ ...initialCampaignState, currentMonth: 4, monthLabel: "Month 4" });
    expect(normalized?.monthLabel).toBe("Nightal 1374 DR");

    const explicit = normalizeCampaignState({ ...initialCampaignState, currentMonth: 2, monthLabel: "Elient 1374 DR" });
    expect(explicit?.monthLabel).toBe("Elient 1374 DR");
  });

  it("auto-allocates commission slider hours by priority and caps at remaining work", () => {
    const plans = allocateCommissionProjectHours(initialCampaignState, 220);
    const byId = Object.fromEntries(plans.map((plan) => [plan.projectId, plan]));

    expect(byId["basenhack-full-plate"].allocatedHours).toBe(166);
    expect(byId["fairstream-breastplate"].allocatedHours).toBe(54);
    expect(byId["purple-worm-tooth"].allocatedHours).toBe(0);
    expect(byId["iron-doors-mermaid"].allocatedHours).toBe(0);
    expect(plans.filter((plan) => plan.selected).every((plan) => plan.allocatedHours > 0)).toBe(true);
  });

  it("distinguishes inventory material variants for display", () => {
    const steelBreastplate = initialCampaignState.inventory.find((stock) => stock.id === "breastplate-mw");
    const mithrilBreastplate = initialCampaignState.inventory.find((stock) => stock.id === "mithril-breastplate");

    expect(steelBreastplate && inventoryItemDisplayName(steelBreastplate.item)).toBe("Steel Breastplate (MW)");
    expect(mithrilBreastplate && inventoryItemDisplayName(mithrilBreastplate.item)).toBe("Mithril Breastplate");
    expect(mithrilBreastplate && itemPrimaryMaterialLabel(mithrilBreastplate.item)).toBe("Mithril");
    expect(steelBreastplate && itemRecipeSummary(steelBreastplate.item)).toContain("30 lb Steel");
  });

  it("validates over-allocated commission hours", () => {
    const draft = {
      ...createResolutionDraft(initialCampaignState),
      allocation: {
        commissionWorkHours: 10,
        genericShopWorkHours: 80,
        repairsWalkinsHours: 40,
        jordyTrainingHours: 20,
      },
    };

    expect(validateResolutionPlan(initialCampaignState, draft)).toContain(
      "Commission allocation exceeds available commission hours.",
    );
  });

  it("maps event strength and crafting quality thresholds", () => {
    expect(eventStrength(20)).toBeCloseTo(1);
    expect(eventStrength(1)).toBeCloseTo(-1);
    expect(craftQualityFromRoll(20)).toBe("natural_20");
    expect(craftQualityFromRoll(17)).toBe("exceptional");
    expect(craftQualityFromRoll(13)).toBe("excellent");
    expect(craftQualityFromRoll(9)).toBe("success");
    expect(craftQualityFromRoll(5)).toBe("minor_failure");
    expect(craftQualityFromRoll(1)).toBe("bad_failure");
    expect(progressEfficiencyFromRoll(20)).toBe(1.5);
    expect(progressEfficiencyFromRoll(4)).toBe(0.5);
  });

  it("uses v1 event effects with target, hours, money, and volatility only", () => {
    const tyrande = createEventResolution("Tyrande", 20, initialCampaignState);
    const valthen = createEventResolution("Valthen", 20, initialCampaignState);
    const guild = createEventResolution("Guild", 3, initialCampaignState);

    expect(tyrande.effects).toEqual({
      target: "commission",
      hoursDelta: 0,
      moneyDelta: 600,
      volatilityDelta: 300,
    });
    expect(valthen.effects.target).toBe("commission");
    expect(valthen.effects.hoursDelta).toBeGreaterThan(0);
    expect(valthen.effects.volatilityDelta).toBeLessThan(0);
    expect(guild.effects.moneyDelta).toBeLessThan(0);
    expect(guild.effects.volatilityDelta).toBeLessThan(0);
  });

  it("seeds Taark's public craft totals and the Iron Doors commission", () => {
    const bonuses = initialCampaignState.profile.skills;
    const toolForgeBonus = initialCampaignState.profile.forgeBonus + initialCampaignState.profile.toolBonus;
    const ironDoors = initialCampaignState.projects.find((project) => project.id === "iron-doors-mermaid");

    expect(bonuses.armorsmithing + toolForgeBonus).toBe(35);
    expect(bonuses.weaponsmithing + toolForgeBonus).toBe(12);
    expect(bonuses.blacksmithing + toolForgeBonus).toBe(7);
    expect(ironDoors?.item.category).toBe("blacksmithing");
    expect(ironDoors?.client).toBe("The Mermaid");
  });

  it("forecasts deterministically without mutating campaign state", () => {
    const draft = rolledDraft();
    const before = JSON.stringify(initialCampaignState);
    const first = forecastMonthlyPlan(initialCampaignState, draft, 100);
    const second = forecastMonthlyPlan(initialCampaignState, draft, 100);

    expect(first).toEqual(second);
    expect(JSON.stringify(initialCampaignState)).toBe(before);
    expect(first.probabilityNegativeProfit).toBeGreaterThanOrEqual(0);
  });

  it("simulates before applying and then applies with undo snapshot support", () => {
    const draft = rolledDraft();
    const before = JSON.stringify(initialCampaignState);
    const simulation = resolveMonthlyDraft(initialCampaignState, draft);

    expect(JSON.stringify(initialCampaignState)).toBe(before);
    expect(simulation.cards.length).toBeGreaterThan(10);
    expect(simulation.report.materialsBefore.Adamantine.lbs).toBe(initialCampaignState.materials.Adamantine.lbs);

    const applied = applyMonthlySimulation(initialCampaignState, simulation);
    expect(applied.currentMonth).toBe(initialCampaignState.currentMonth + 1);
    expect(applied.ledger).toHaveLength(initialCampaignState.ledger.length + 1);
    expect(undoLastAppliedMonth(initialCampaignState)?.currentMonth).toBe(initialCampaignState.currentMonth);
  });
});
