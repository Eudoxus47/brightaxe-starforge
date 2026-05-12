import { describe, expect, it } from "vitest";
import { applyMonthlySimulation, createResolutionDraft, eventActors, forecastMonthlyPlan, resolveMonthlyDraft, rollDie } from "./forge-engine";
import type { CampaignState, MonthlyResolutionDraft } from "./forge-types";
import { initialCampaignState } from "./seed";

function completeRolls(state: CampaignState, draft: MonthlyResolutionDraft, salt: string): MonthlyResolutionDraft {
  return {
    ...draft,
    forecast: forecastMonthlyPlan(state, draft, 500),
    eventRolls: Object.fromEntries(
      eventActors.map((actor, index) => [actor, rollDie(`${salt}:event:${state.currentMonth}:${actor}:${index}`)]),
    ),
    taarkRolls: {
      shopSales: rollDie(`${salt}:shop:${state.currentMonth}`),
      genericInventoryReplenishment: rollDie(`${salt}:inventory:${state.currentMonth}`),
      materialManagement: rollDie(`${salt}:materials:${state.currentMonth}`),
    },
    projectRolls: draft.projectRolls.map((entry, index) => ({
      ...entry,
      roll: draft.projectPlans.find((plan) => plan.projectId === entry.projectId)?.selected
        ? rollDie(`${salt}:project:${state.currentMonth}:${entry.projectId}:${index}`)
        : undefined,
    })),
  };
}

describe("monthly balance audit", () => {
  it("keeps several staged month playthroughs near the intended DM target band", () => {
    let state = initialCampaignState;
    const reports = [];

    for (let index = 0; index < 6; index += 1) {
      const draft = completeRolls(state, createResolutionDraft(state), `audit-${index}`);
      const simulation = resolveMonthlyDraft(state, draft);
      reports.push({
        month: state.currentMonth,
        net: simulation.report.totalNetProfit,
        sigma: simulation.forecast.profitSigma,
        reputationChange: simulation.report.reputationChange,
      });
      state = applyMonthlySimulation(state, simulation);
    }

    const averageNet = Math.round(reports.reduce((total, report) => total + report.net, 0) / reports.length);
    const largestReputationGain = Math.max(...reports.map((report) => report.reputationChange));

    expect(averageNet).toBeGreaterThanOrEqual(1500);
    expect(averageNet).toBeLessThanOrEqual(3600);
    expect(largestReputationGain).toBeLessThanOrEqual(1);
    expect(reports.every((report) => report.sigma >= 350)).toBe(true);
  });
});
