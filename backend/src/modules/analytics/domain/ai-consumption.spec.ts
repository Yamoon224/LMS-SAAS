import { averageCreditValue, buildAiConsumption, parseCostPerWord } from "./ai-consumption";
import type { RawJobAggregate } from "./ai-consumption";

const row = (overrides: Partial<RawJobAggregate>): RawJobAggregate => ({
  tenantId: "t1",
  tenantName: "Acme",
  status: "COMPLETED",
  jobsCount: 1,
  debitedCredits: 100,
  words: 1000,
  ...overrides,
});

const noConfig = { providerCostPerWord: null, averageCreditValue: null };

describe("buildAiConsumption", () => {
  it("ne compte comme consommés que les crédits des tâches terminées (une tâche échouée est remboursée)", () => {
    const report = buildAiConsumption(
      [
        row({ status: "COMPLETED", jobsCount: 2, debitedCredits: 300, words: 3000 }),
        row({ status: "FAILED", jobsCount: 1, debitedCredits: 500, words: 5000 }),
        row({ status: "ESTIMATED", jobsCount: 4, debitedCredits: 0, words: 8000 }),
      ],
      noConfig,
    );
    expect(report.tenants[0]).toMatchObject({
      jobsCount: 7,
      completedJobs: 2,
      failedJobs: 1,
      creditsConsumed: 300,
      wordsTranslated: 3000,
    });
  });

  it("regroupe par entreprise et classe de la plus consommatrice à la moins consommatrice", () => {
    const report = buildAiConsumption(
      [
        row({ tenantId: "t1", tenantName: "Acme", debitedCredits: 100 }),
        row({ tenantId: "t2", tenantName: "Beta", debitedCredits: 900 }),
        row({ tenantId: "t1", tenantName: "Acme", status: "FAILED", debitedCredits: 50 }),
      ],
      noConfig,
    );
    expect(report.tenants.map((tenant) => [tenant.tenantName, tenant.creditsConsumed])).toEqual([
      ["Beta", 900],
      ["Acme", 100],
    ]);
    expect(report.totals).toMatchObject({ jobsCount: 3, creditsConsumed: 1000 });
  });

});

describe("buildAiConsumption — coût et marge", () => {
  it("laisse coût, valeur et marge à null tant que rien n'est configuré, au lieu de les inventer", () => {
    const report = buildAiConsumption([row({})], noConfig);
    expect(report.totals.providerCostEstimate).toBeNull();
    expect(report.totals.creditsValueEstimate).toBeNull();
    expect(report.totals.marginEstimate).toBeNull();
    expect(report.tenants[0]?.providerCostEstimate).toBeNull();
  });

  it("calcule coût, valeur et marge quand les deux paramètres sont connus", () => {
    const report = buildAiConsumption([row({ debitedCredits: 1000, words: 10000 })], {
      providerCostPerWord: 0.5,
      averageCreditValue: 2,
    });
    expect(report.tenants[0]?.providerCostEstimate).toBe(5000);
    expect(report.totals).toMatchObject({ providerCostEstimate: 5000, creditsValueEstimate: 2000, marginEstimate: -3000 });
  });

  it("n'affiche pas de marge si seule l'une des deux données est connue", () => {
    const onlyCost = buildAiConsumption([row({})], { providerCostPerWord: 0.5, averageCreditValue: null });
    expect(onlyCost.totals.providerCostEstimate).not.toBeNull();
    expect(onlyCost.totals.marginEstimate).toBeNull();
    const onlyValue = buildAiConsumption([row({})], { providerCostPerWord: null, averageCreditValue: 2 });
    expect(onlyValue.totals.creditsValueEstimate).not.toBeNull();
    expect(onlyValue.totals.marginEstimate).toBeNull();
  });

  it("renvoie un rapport vide sans tâche", () => {
    const report = buildAiConsumption([], noConfig);
    expect(report.tenants).toEqual([]);
    expect(report.totals).toMatchObject({ jobsCount: 0, creditsConsumed: 0, wordsTranslated: 0 });
  });
});

describe("parseCostPerWord", () => {
  it.each([undefined, "", "  ", "abc", "0", "-1", "Infinity", "NaN"])("traite %j comme « non configuré »", (raw) => {
    expect(parseCostPerWord(raw)).toBeNull();
  });

  it("accepte un nombre positif", () => {
    expect(parseCostPerWord("0.35")).toBe(0.35);
    expect(parseCostPerWord(" 2 ")).toBe(2);
  });
});

describe("averageCreditValue", () => {
  it("divise le total payé par le total de crédits obtenus", () => {
    expect(
      averageCreditValue([
        { amount: 5000, credits: 10000 },
        { amount: 20000, credits: 50000 },
      ]),
    ).toBeCloseTo(25000 / 60000, 10);
  });

  it("renvoie null sans vente ni crédits", () => {
    expect(averageCreditValue([])).toBeNull();
    expect(averageCreditValue([{ amount: 100, credits: 0 }])).toBeNull();
  });
});
