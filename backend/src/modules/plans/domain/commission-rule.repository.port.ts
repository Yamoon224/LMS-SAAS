export type CommissionScope = "GLOBAL" | "PLAN" | "TENANT" | "COURSE";
export type CommissionType = "ONLINE" | "OFFLINE";

export interface CommissionRuleRecord {
  id: string;
  scope: CommissionScope;
  type: CommissionType;
  tenantId: string | null;
  planId: string | null;
  courseId: string | null;
  percentRate: number | null;
  fixedAmount: number | null;
  /** Début de validité ; une règle remplacée porte une fin (`validUntil`), une règle en vigueur n'en a pas. */
  validFrom: Date;
  validUntil: Date | null;
}

export interface SetCommissionRuleData {
  scope: CommissionScope;
  type: CommissionType;
  tenantId?: string;
  planId?: string;
  courseId?: string;
  percentRate?: number;
  fixedAmount?: number;
}

/**
 * Port RBAC des commissions (ADM-15, ADM-16). Les règles existantes ne sont
 * jamais modifiées : une nouvelle règle est créée avec une date de début,
 * ce qui permet de figer le taux appliqué sur chaque vente (RG-27).
 */
export interface CommissionRuleRepositoryPort {
  create(data: SetCommissionRuleData): Promise<CommissionRuleRecord>;
  /**
   * Remplace une règle en vigueur par une nouvelle version (mêmes portée, type et cible, nouveaux taux) : l'ancienne est
   * close à l'instant T, la nouvelle commence à T. Renvoie `null` si la règle n'existe pas ou n'est plus en vigueur.
   */
  supersede(id: string, rates: { percentRate: number | null; fixedAmount: number | null }): Promise<CommissionRuleRecord | null>;
  /**
   * Résout la règle à appliquer pour une vente, par ordre de priorité
   * décroissante : formation > entreprise > plan > globale (ADM-15).
   */
  resolveApplicableRule(
    type: CommissionType,
    tenantId: string,
    options?: { courseId?: string; planId?: string },
  ): Promise<CommissionRuleRecord | null>;
  /** ADM-15/ADM-16: vue Admin de toutes les règles définies, les plus récentes d'abord. */
  listAll(): Promise<CommissionRuleRecord[]>;
}

export const COMMISSION_RULE_REPOSITORY = Symbol("COMMISSION_RULE_REPOSITORY");
