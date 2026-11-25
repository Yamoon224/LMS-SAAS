import {
  computeChurnRate,
  computeCommissionRate,
  computeCompletionRate,
  normalizeToMonthlyAmount,
} from "./metrics";

describe("computeCompletionRate", () => {
  it("calcule le pourcentage de complétion", () => {
    expect(computeCompletionRate(25, 100)).toBe(25);
  });

  it("arrondit à deux décimales", () => {
    expect(computeCompletionRate(1, 3)).toBe(33.33);
  });

  it("retourne 0 si aucune inscription pertinente", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });
});

describe("normalizeToMonthlyAmount", () => {
  it("retourne le montant tel quel pour un abonnement mensuel", () => {
    expect(normalizeToMonthlyAmount(10000, "MONTHLY")).toBe(10000);
  });

  it("divise par 3 pour un abonnement trimestriel", () => {
    expect(normalizeToMonthlyAmount(30000, "QUARTERLY")).toBe(10000);
  });

  it("divise par 12 pour un abonnement annuel", () => {
    expect(normalizeToMonthlyAmount(120000, "YEARLY")).toBe(10000);
  });
});

describe("computeChurnRate", () => {
  it("calcule le taux de résiliation", () => {
    expect(computeChurnRate(5, 100)).toBe(5);
  });

  it("retourne 0 si aucun abonnement actif en début de période", () => {
    expect(computeChurnRate(0, 0)).toBe(0);
  });
});

describe("computeCommissionRate", () => {
  it("calcule le taux de commission par rapport au chiffre d'affaires brut", () => {
    expect(computeCommissionRate(1500, 10000)).toBe(15);
  });

  it("retourne 0 si le chiffre d'affaires brut est nul", () => {
    expect(computeCommissionRate(0, 0)).toBe(0);
  });
});
