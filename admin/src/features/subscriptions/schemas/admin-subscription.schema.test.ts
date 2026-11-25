import { describe, expect, it } from "vitest";

import {
  buildDiscountPayload,
  buildExtendPayload,
  describeDiscount,
  discountSchema,
  extendSubscriptionSchema,
  offerPlanSchema,
} from "./admin-subscription.schema";

describe("extendSubscriptionSchema", () => {
  it("exige des jours ou une date selon le mode", () => {
    expect(extendSubscriptionSchema.safeParse({ mode: "days" }).success).toBe(false);
    expect(extendSubscriptionSchema.safeParse({ mode: "date" }).success).toBe(false);
    expect(extendSubscriptionSchema.safeParse({ mode: "days", days: 400 }).success).toBe(false);
    expect(extendSubscriptionSchema.safeParse({ mode: "days", days: "15" }).success).toBe(true);
    expect(extendSubscriptionSchema.safeParse({ mode: "date", until: "2027-01-15" }).success).toBe(true);
  });

  it("construit une charge utile avec des jours OU une date (fin de journée UTC)", () => {
    expect(buildExtendPayload({ mode: "days", days: 10, reason: " geste " })).toEqual({ days: 10, reason: "geste" });
    expect(buildExtendPayload({ mode: "date", until: "2027-01-15" })).toEqual({
      until: "2027-01-15T23:59:59.000Z",
      reason: undefined,
    });
  });
});

describe("discountSchema", () => {
  it("borne le pourcentage à 100 et les périodes à 36", () => {
    expect(discountSchema.safeParse({ kind: "percent", value: 101, periods: 1 }).success).toBe(false);
    expect(discountSchema.safeParse({ kind: "percent", value: 20, periods: 37 }).success).toBe(false);
    expect(discountSchema.safeParse({ kind: "amount", value: 5000, periods: 3 }).success).toBe(true);
    expect(discountSchema.safeParse({ kind: "amount", value: 0, periods: 3 }).success).toBe(false);
  });

  it("n'envoie qu'un pourcentage OU un montant", () => {
    expect(buildDiscountPayload({ kind: "percent", value: 20, periods: 3 })).toEqual({
      percent: 20,
      periods: 3,
      reason: undefined,
    });
    expect(buildDiscountPayload({ kind: "amount", value: 5000, periods: 2, reason: "x" })).toEqual({
      amount: 5000,
      periods: 2,
      reason: "x",
    });
  });

  it("décrit la remise restante, rien si les périodes sont épuisées", () => {
    const fmt = (n: number) => `${n} F`;
    expect(describeDiscount({ discountPercent: 20, discountAmount: null, discountPeriodsRemaining: 3 }, fmt)).toBe(
      "20 % · 3 périodes restantes",
    );
    expect(describeDiscount({ discountPercent: null, discountAmount: 5000, discountPeriodsRemaining: 1 }, fmt)).toBe(
      "5000 F par période · 1 période restante",
    );
    expect(describeDiscount({ discountPercent: 20, discountAmount: null, discountPeriodsRemaining: null }, fmt)).toBeNull();
  });
});

describe("offerPlanSchema", () => {
  it("rend le motif obligatoire", () => {
    expect(offerPlanSchema.safeParse({ planPriceId: "pp", days: 30, reason: "   " }).success).toBe(false);
    expect(offerPlanSchema.safeParse({ planPriceId: "pp", days: 30, reason: "Partenariat" }).success).toBe(true);
    expect(offerPlanSchema.safeParse({ planPriceId: "", days: 30, reason: "Partenariat" }).success).toBe(false);
  });
});
