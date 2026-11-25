import type { AiConsumptionRepositoryPort } from "../domain/ai-consumption.repository.port";

import { GetAiConsumptionUseCase } from "./get-ai-consumption.use-case";

const range = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-30T23:59:59Z") };

function build(sales: { amount: number; credits: number }[] = []) {
  const repository: jest.Mocked<AiConsumptionRepositoryPort> = {
    getJobAggregates: jest.fn().mockResolvedValue([
      { tenantId: "t1", tenantName: "Acme", status: "COMPLETED", jobsCount: 1, debitedCredits: 1000, words: 10000 },
    ]),
    getCreditPackSales: jest.fn().mockResolvedValue(sales),
  };
  return { useCase: new GetAiConsumptionUseCase(repository), repository };
}

describe("GetAiConsumptionUseCase", () => {
  const original = process.env.AI_TRANSLATION_COST_PER_WORD;
  afterEach(() => {
    if (original === undefined) delete process.env.AI_TRANSLATION_COST_PER_WORD;
    else process.env.AI_TRANSLATION_COST_PER_WORD = original;
  });

  it("interroge la période demandée et la renvoie dans le rapport", async () => {
    const { useCase, repository } = build();
    const report = await useCase.execute(range);
    expect(repository.getJobAggregates).toHaveBeenCalledWith(range);
    expect(report).toMatchObject({ periodStart: range.from, periodEnd: range.to });
  });

  it("laisse coût et marge à null sans coût unitaire configuré", async () => {
    delete process.env.AI_TRANSLATION_COST_PER_WORD;
    const report = await build([{ amount: 5000, credits: 10000 }]).useCase.execute(range);
    expect(report.providerCostPerWord).toBeNull();
    expect(report.totals.providerCostEstimate).toBeNull();
    expect(report.totals.marginEstimate).toBeNull();
    expect(report.totals.creditsValueEstimate).toBe(500);
  });

  it("calcule la marge avec un coût configuré et des packs vendus", async () => {
    process.env.AI_TRANSLATION_COST_PER_WORD = "0.01";
    const report = await build([{ amount: 5000, credits: 10000 }]).useCase.execute(range);
    expect(report.totals).toMatchObject({ providerCostEstimate: 100, creditsValueEstimate: 500, marginEstimate: 400 });
  });

  it("ignore un coût invalide plutôt que de le traiter comme zéro", async () => {
    process.env.AI_TRANSLATION_COST_PER_WORD = "gratuit";
    const report = await build([{ amount: 5000, credits: 10000 }]).useCase.execute(range);
    expect(report.providerCostPerWord).toBeNull();
    expect(report.totals.marginEstimate).toBeNull();
  });
});
