import type { PlanFeatures } from "./plan-quotas";

/**
 * Port fournissant les feature flags (et quantités associées) du plan
 * actuellement actif pour un tenant — distinct de PlanQuotaRepositoryPort
 * qui ne couvre que les quotas numériques (BE-03).
 */
export interface PlanFeatureRepositoryPort {
  getFeaturesForTenant(tenantId: string): Promise<PlanFeatures | null>;
}

export const PLAN_FEATURE_REPOSITORY = Symbol("PLAN_FEATURE_REPOSITORY");
