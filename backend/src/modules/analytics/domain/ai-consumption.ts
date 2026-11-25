/**
 * ADM-34 : consommation IA par entreprise — tâches de traduction, crédits consommés, coût fournisseur estimé et marge.
 * Fonctions pures (section 13.1) : l'infrastructure fournit les comptages bruts, le domaine calcule.
 */

export type TranslationJobStatusValue = "ESTIMATED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

/** Agrégat brut d'un ensemble de tâches : une entreprise, un statut. */
export interface RawJobAggregate {
  tenantId: string;
  tenantName: string;
  status: TranslationJobStatusValue;
  jobsCount: number;
  /** Crédits effectivement débités à la confirmation. */
  debitedCredits: number;
  /** Mots traduits (somme des mots comptés à l'estimation). */
  words: number;
}

export interface TenantAiConsumption {
  tenantId: string;
  tenantName: string;
  /** Toutes les tâches créées sur la période, estimations non confirmées comprises. */
  jobsCount: number;
  completedJobs: number;
  failedJobs: number;
  /** Crédits consommés : tâches TERMINÉES uniquement (une tâche échouée est remboursée automatiquement). */
  creditsConsumed: number;
  wordsTranslated: number;
  /** null tant que le coût unitaire du fournisseur n'est pas configuré. */
  providerCostEstimate: number | null;
}

export interface AiConsumptionConfig {
  /** Coût fournisseur estimé par mot traduit, en unité de la devise ; null = non configuré. */
  providerCostPerWord: number | null;
  /** Valeur moyenne d'un crédit vendu (prix des packs achetés / crédits correspondants) ; null = aucune vente. */
  averageCreditValue: number | null;
}

export interface AiConsumptionReport {
  tenants: TenantAiConsumption[];
  totals: {
    jobsCount: number;
    completedJobs: number;
    failedJobs: number;
    creditsConsumed: number;
    wordsTranslated: number;
    providerCostEstimate: number | null;
    /** Valeur estimée des crédits consommés, au prix moyen des packs vendus ; null sans vente de packs. */
    creditsValueEstimate: number | null;
    /** Valeur estimée des crédits − coût fournisseur estimé ; null si l'un des deux est inconnu. */
    marginEstimate: number | null;
  };
  providerCostPerWord: number | null;
  averageCreditValue: number | null;
}

/**
 * Lit un coût unitaire dans une variable d'environnement : un nombre positif ou fini, sinon null (« non configuré »).
 * Une valeur invalide ne doit jamais produire un coût de 0 qui ferait paraître la marge excellente.
 */
export function parseCostPerWord(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCost(words: number, costPerWord: number | null): number | null {
  return costPerWord === null ? null : roundAmount(words * costPerWord);
}

export function buildAiConsumption(rows: readonly RawJobAggregate[], config: AiConsumptionConfig): AiConsumptionReport {
  const byTenant = new Map<string, TenantAiConsumption>();

  for (const row of rows) {
    const entry =
      byTenant.get(row.tenantId) ??
      ({
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        jobsCount: 0,
        completedJobs: 0,
        failedJobs: 0,
        creditsConsumed: 0,
        wordsTranslated: 0,
        providerCostEstimate: null,
      } satisfies TenantAiConsumption);

    entry.jobsCount += row.jobsCount;
    if (row.status === "FAILED") entry.failedJobs += row.jobsCount;
    if (row.status === "COMPLETED") {
      entry.completedJobs += row.jobsCount;
      entry.creditsConsumed += row.debitedCredits;
      entry.wordsTranslated += row.words;
    }
    byTenant.set(row.tenantId, entry);
  }

  const tenants = [...byTenant.values()]
    .map((tenant) => ({ ...tenant, providerCostEstimate: toCost(tenant.wordsTranslated, config.providerCostPerWord) }))
    .sort((a, b) => b.creditsConsumed - a.creditsConsumed || a.tenantName.localeCompare(b.tenantName));

  const sum = (pick: (tenant: TenantAiConsumption) => number) => tenants.reduce((total, tenant) => total + pick(tenant), 0);
  const creditsConsumed = sum((tenant) => tenant.creditsConsumed);
  const wordsTranslated = sum((tenant) => tenant.wordsTranslated);
  const providerCostEstimate = toCost(wordsTranslated, config.providerCostPerWord);
  const creditsValueEstimate =
    config.averageCreditValue === null ? null : roundAmount(creditsConsumed * config.averageCreditValue);

  return {
    tenants,
    totals: {
      jobsCount: sum((tenant) => tenant.jobsCount),
      completedJobs: sum((tenant) => tenant.completedJobs),
      failedJobs: sum((tenant) => tenant.failedJobs),
      creditsConsumed,
      wordsTranslated,
      providerCostEstimate,
      creditsValueEstimate,
      marginEstimate:
        providerCostEstimate === null || creditsValueEstimate === null
          ? null
          : roundAmount(creditsValueEstimate - providerCostEstimate),
    },
    providerCostPerWord: config.providerCostPerWord,
    averageCreditValue: config.averageCreditValue,
  };
}

/** Prix moyen d'un crédit à partir des ventes de packs (montant payé, crédits obtenus) ; null sans vente. */
export function averageCreditValue(sales: readonly { amount: number; credits: number }[]): number | null {
  const credits = sales.reduce((total, sale) => total + sale.credits, 0);
  if (credits <= 0) return null;
  return sales.reduce((total, sale) => total + sale.amount, 0) / credits;
}
