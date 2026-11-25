import { BillingPeriod } from "./billing-period";
import { Plan, PlanArchivedError } from "./plan.entity";

function buildPlan(overrides: Partial<{ isArchived: boolean }> = {}): Plan {
  return Plan.fromPersistence({
    id: "plan-1",
    name: "Starter",
    description: null,
    isPublic: true,
    isArchived: overrides.isArchived ?? false,
    quotas: { maxCourses: 10 },
    features: { aiTranslation: false },
    commissionRatePercent: 10,
    prices: [
      {
        id: "price-1",
        period: BillingPeriod.MONTHLY,
        currency: "XOF",
        amount: 25000,
        trialDays: 14,
        version: 1,
        isActive: true,
      },
      {
        id: "price-0",
        period: BillingPeriod.MONTHLY,
        currency: "XOF",
        amount: 20000,
        trialDays: 14,
        version: 0,
        isActive: false,
      },
    ],
  });
}

describe("Plan entity", () => {
  it("exposes the persisted properties", () => {
    const plan = buildPlan();
    expect(plan.id).toBe("plan-1");
    expect(plan.name).toBe("Starter");
    expect(plan.description).toBeNull();
    expect(plan.isPublic).toBe(true);
    expect(plan.quotas).toEqual({ maxCourses: 10 });
    expect(plan.features).toEqual({ aiTranslation: false });
    expect(plan.commissionRatePercent).toBe(10);
    expect(plan.isArchived).toBe(false);
    expect(plan.prices).toHaveLength(2);
  });

  it("allows subscribing to a non-archived plan", () => {
    expect(() => buildPlan().assertSubscribable()).not.toThrow();
  });

  it("rejects subscribing to an archived plan (ADM-13)", () => {
    const plan = buildPlan({ isArchived: true });
    expect(() => plan.assertSubscribable()).toThrow(PlanArchivedError);
  });

  it("returns only the active price for a given period (ADM-17 versioning)", () => {
    const plan = buildPlan();
    const activePrice = plan.findActivePrice(BillingPeriod.MONTHLY);
    expect(activePrice?.amount).toBe(25000);
    expect(activePrice?.version).toBe(1);
  });

  it("returns undefined when no active price exists for a period", () => {
    const plan = buildPlan();
    expect(plan.findActivePrice(BillingPeriod.YEARLY)).toBeUndefined();
  });
});
