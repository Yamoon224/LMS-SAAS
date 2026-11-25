import { Inject, Injectable } from "@nestjs/common";

import { averageCreditValue, buildAiConsumption, parseCostPerWord } from "../domain/ai-consumption";
import type { AiConsumptionReport } from "../domain/ai-consumption";
import { AI_CONSUMPTION_REPOSITORY } from "../domain/ai-consumption.repository.port";
import type { AiConsumptionRepositoryPort } from "../domain/ai-consumption.repository.port";
import type { DateRange } from "../domain/analytics.repository.port";

/**
 * ADM-34 : consommation IA par entreprise. Le coût fournisseur par mot vient de `AI_TRANSLATION_COST_PER_WORD`
 * (même devise que les prix des packs) : absent ou invalide, coût et marge restent « non configurés » plutôt que
 * d'être estimés à partir d'une valeur inventée.
 */
@Injectable()
export class GetAiConsumptionUseCase {
  constructor(@Inject(AI_CONSUMPTION_REPOSITORY) private readonly repository: AiConsumptionRepositoryPort) {}

  async execute(range: DateRange): Promise<AiConsumptionReport & { periodStart: Date; periodEnd: Date }> {
    const [rows, sales] = await Promise.all([
      this.repository.getJobAggregates(range),
      this.repository.getCreditPackSales(),
    ]);
    const report = buildAiConsumption(rows, {
      providerCostPerWord: parseCostPerWord(process.env.AI_TRANSLATION_COST_PER_WORD),
      averageCreditValue: averageCreditValue(sales),
    });
    return { ...report, periodStart: range.from, periodEnd: range.to };
  }
}
