/**
 * Port fournissant, pour un tenant, le quota configuré sur son plan et
 * l'usage courant correspondant — l'implémentation Prisma agrège sur les
 * tables métier (Course, User, LiveSession...).
 */
export interface PlanQuotaRepositoryPort {
  getQuotaLimit(tenantId: string, quotaName: string): Promise<number | null>;
  getCurrentUsage(tenantId: string, quotaName: string): Promise<number>;
}

export const PLAN_QUOTA_REPOSITORY = Symbol("PLAN_QUOTA_REPOSITORY");
