/**
 * Quotas d'un plan (ADM-14). `null` ou absent = illimité.
 * Les clés doivent rester synchronisées avec plan-quota.prisma-repository.ts
 * (usage courant calculé par quota) et avec @CheckQuota(name) côté guards.
 */
export interface PlanQuotas {
  maxCourses?: number;
  maxActiveLearners?: number;
  maxManagers?: number;
  storageGb?: number;
  liveSessionsPerMonth?: number;
}

/** Fonctionnalités incluses dans un plan (ADM-14, feature flags). */
export interface PlanFeatures {
  aiTranslation?: boolean;
  aiTranslationCreditsIncluded?: number;
  customCertificates?: boolean;
  customDomain?: boolean;
}
