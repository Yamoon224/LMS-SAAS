import { describe, expect, it } from "vitest";

import { isRuleCurrent, reviseCommissionRuleSchema } from "./commission-rule.schema";
import type { CommissionRule } from "./commission-rule.schema";

const rule = (validUntil: Date | null): CommissionRule => ({
  id: "r1",
  scope: "GLOBAL",
  type: "ONLINE",
  tenantId: null,
  planId: null,
  courseId: null,
  percentRate: 10,
  fixedAmount: null,
  validFrom: new Date("2026-01-01"),
  validUntil,
});

describe("isRuleCurrent", () => {
  it("considère en vigueur une règle sans fin ou dont la fin est à venir", () => {
    expect(isRuleCurrent(rule(null))).toBe(true);
    expect(isRuleCurrent(rule(new Date(Date.now() + 60_000)))).toBe(true);
  });

  it("considère remplacée une règle dont la fin est passée", () => {
    expect(isRuleCurrent(rule(new Date(Date.now() - 60_000)))).toBe(false);
  });
});

describe("reviseCommissionRuleSchema", () => {
  it("accepte un taux, un montant fixe, ou les deux", () => {
    expect(reviseCommissionRuleSchema.safeParse({ percentRate: 12.5 }).success).toBe(true);
    expect(reviseCommissionRuleSchema.safeParse({ fixedAmount: 500 }).success).toBe(true);
    expect(reviseCommissionRuleSchema.safeParse({ percentRate: 5, fixedAmount: 100 }).success).toBe(true);
  });

  it("refuse l'absence de tout taux et les valeurs hors bornes", () => {
    expect(reviseCommissionRuleSchema.safeParse({}).success).toBe(false);
    expect(reviseCommissionRuleSchema.safeParse({ percentRate: 101 }).success).toBe(false);
    expect(reviseCommissionRuleSchema.safeParse({ fixedAmount: -1 }).success).toBe(false);
  });
});
