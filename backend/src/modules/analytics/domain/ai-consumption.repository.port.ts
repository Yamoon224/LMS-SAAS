import type { RawJobAggregate } from "./ai-consumption";
import type { DateRange } from "./analytics.repository.port";

/** Lecture seule des données de consommation IA (ADM-34). */
export interface AiConsumptionRepositoryPort {
  /** Tâches de traduction créées sur la période, agrégées par entreprise et par statut. */
  getJobAggregates(range: DateRange): Promise<RawJobAggregate[]>;
  /** Ventes de packs de crédits encaissées (montant payé, crédits obtenus), toutes périodes confondues. */
  getCreditPackSales(): Promise<{ amount: number; credits: number }[]>;
}

export const AI_CONSUMPTION_REPOSITORY = Symbol("AI_CONSUMPTION_REPOSITORY");
