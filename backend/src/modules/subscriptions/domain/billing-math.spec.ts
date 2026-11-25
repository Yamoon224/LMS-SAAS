import { addMonthsClamped, applyDiscount, comparePlanPrices, computeProration, nextPeriodEnd } from "./billing-math";

const monthly = (amount: number, currency = "XOF") => ({ amount, period: "MONTHLY", currency });
const yearly = (amount: number) => ({ amount, period: "YEARLY", currency: "XOF" });
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe("addMonthsClamped", () => {
  it("borne au dernier jour du mois", () => {
    expect(iso(addMonthsClamped(day("2026-01-31"), 1))).toBe("2026-02-28");
    expect(iso(addMonthsClamped(day("2028-01-31"), 1))).toBe("2028-02-29");
    expect(iso(addMonthsClamped(day("2026-03-31"), -1))).toBe("2026-02-28");
    expect(iso(addMonthsClamped(day("2026-11-15"), 3))).toBe("2027-02-15");
  });
});

describe("comparePlanPrices", () => {
  it("ramène les prix au mois", () => {
    expect(comparePlanPrices(monthly(10_000), yearly(150_000))).toBe("UPGRADE");
    expect(comparePlanPrices(monthly(10_000), yearly(90_000))).toBe("DOWNGRADE");
    expect(comparePlanPrices(monthly(10_000), yearly(120_000))).toBe("SAME");
  });

  it("refuse de comparer deux devises", () => {
    expect(comparePlanPrices(monthly(10_000), monthly(20_000, "EUR"))).toBe("INCOMPARABLE");
  });
});

describe("computeProration", () => {
  const periodEnd = day("2026-12-01"); // période du 1er novembre au 1er décembre : 30 jours

  it("montée en gamme : différence au prorata des jours restants", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-16"),
    });
    expect(result).toMatchObject({
      direction: "UPGRADE",
      timing: "IMMEDIATE",
      totalDays: 30,
      remainingDays: 15,
      creditAmount: 5_000,
      chargeAmount: 12_500,
      amountDue: 7_500,
    });
  });

  it("arrondit le crédit à l'inférieur et le coût au supérieur (entiers XOF)", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-24"),
    });
    expect(result.remainingDays).toBe(7);
    expect(result.creditAmount).toBe(2_333); // 2333,33 arrondi à l'inférieur
    expect(result.chargeAmount).toBe(5_834); // 5833,33 arrondi au supérieur
    expect(result.amountDue).toBe(3_501);
    expect(Number.isInteger(result.amountDue)).toBe(true);
  });

  it("compte un jour entamé comme dû", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: new Date("2026-11-30T12:00:00.000Z"),
    });
    expect(result.remainingDays).toBe(1);
  });

  it("périodicités différentes : prix annuel ramené à la période mensuelle courante", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: yearly(150_000),
      periodEnd,
      now: day("2026-11-16"),
    });
    expect(result.chargeAmount).toBe(6_250);
    expect(result.amountDue).toBe(1_250);
  });

  it("à l'échéance (0 jour restant) rien n'est dû", () => {
    const result = computeProration({ current: monthly(10_000), next: monthly(25_000), periodEnd, now: periodEnd });
    expect(result.remainingDays).toBe(0);
    expect(result.amountDue).toBe(0);
  });

  it("descente, même prix ou devises différentes : planifié à l'échéance, sans crédit ni débit", () => {
    for (const next of [monthly(5_000), monthly(10_000), monthly(30_000, "EUR")]) {
      const result = computeProration({ current: monthly(10_000), next, periodEnd, now: day("2026-11-16") });
      expect(result).toMatchObject({ timing: "AT_PERIOD_END", creditAmount: 0, chargeAmount: 0, amountDue: 0 });
    }
  });

  it("essai gratuit : montée immédiate sans prorata", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-16"),
      isTrialing: true,
    });
    expect(result).toMatchObject({ timing: "IMMEDIATE", amountDue: 0 });
  });
});

describe("nextPeriodEnd", () => {
  it("prolonge depuis l'échéance précédente (continuité, même en grâce)", () => {
    const end = nextPeriodEnd(day("2026-12-01"), 1, new Date("2026-12-03T10:00:00.000Z"), false);
    expect(iso(end)).toBe("2027-01-01");
  });

  it("repart de maintenant si l'abonnement avait expiré", () => {
    const end = nextPeriodEnd(day("2026-12-01"), 3, day("2027-01-10"), true);
    expect(iso(end)).toBe("2027-04-10");
  });
});

describe("applyDiscount (ADM-09)", () => {
  it("applique un pourcentage (remise arrondie à l'inférieur) ou un montant fixe, sans jamais passer sous zéro", () => {
    expect(applyDiscount(10_000, { percent: 25 })).toBe(7_500);
    expect(applyDiscount(9_999, { percent: 10 })).toBe(9_000); // remise 999,9 -> 999
    expect(applyDiscount(10_000, { percent: 100 })).toBe(0);
    expect(applyDiscount(10_000, { amount: 3_000 })).toBe(7_000);
    expect(applyDiscount(2_000, { amount: 5_000 })).toBe(0);
  });

  it("ne change rien sans remise", () => {
    expect(applyDiscount(10_000, null)).toBe(10_000);
    expect(applyDiscount(10_000, {})).toBe(10_000);
    expect(applyDiscount(0, { percent: 50 })).toBe(0);
  });
});

describe("computeProration avec remise (ADM-09)", () => {
  const periodEnd = day("2026-12-01"); // 30 jours
  it("calcule crédit et coût sur les montants remisés (mi-période : 15 jours restants)", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-16"),
      discount: { percent: 20 },
    });
    // crédit : 8 000 * 15/30 = 4 000 ; coût : 20 000 * 15/30 = 10 000
    expect(result).toMatchObject({ creditAmount: 4_000, chargeAmount: 10_000, amountDue: 6_000 });
  });

  it("une remise en montant fixe est retranchée de chaque prix, plancher à zéro", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-16"),
      discount: { amount: 12_000 },
    });
    // current -> 0 ; next -> 13 000 : coût 6 500
    expect(result).toMatchObject({ creditAmount: 0, chargeAmount: 6_500, amountDue: 6_500 });
  });

  it("n'altère pas la direction (comparée sur les prix catalogue)", () => {
    const result = computeProration({
      current: monthly(10_000),
      next: monthly(25_000),
      periodEnd,
      now: day("2026-11-16"),
      discount: { percent: 100 },
    });
    expect(result).toMatchObject({ direction: "UPGRADE", amountDue: 0 });
  });
});
