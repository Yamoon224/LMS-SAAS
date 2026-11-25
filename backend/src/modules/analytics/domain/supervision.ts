/**
 * ADM-29 à ADM-32 : vues de supervision globale (toutes entreprises) pour l'Admin plateforme.
 * Lecture seule, volontairement plates : l'Admin consulte, il ne modifie rien depuis ces listes.
 */

export interface SupervisedCourse {
  id: string;
  title: string;
  tenantId: string;
  tenantName: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  type: "CERTIFYING" | "NON_CERTIFYING";
  /** Langue source suivie des langues traduites, sans doublon. */
  locales: string[];
  price: number;
  currency: string;
  enrollmentsCount: number;
  createdAt: Date;
}

export interface SupervisedLearner {
  id: string;
  fullName: string;
  email: string;
  tenantId: string | null;
  tenantName: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
  enrollmentsCount: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface SupervisedCertificate {
  number: string;
  status: "VALID" | "REVOKED" | "REISSUED";
  learnerName: string;
  courseTitle: string;
  tenantId: string;
  tenantName: string;
  scorePercent: number | null;
  issuedAt: Date;
  revokedAt: Date | null;
}

export interface SupervisedTransaction {
  id: string;
  type: "SUBSCRIPTION" | "CREDIT_PURCHASE" | "COURSE_ENROLLMENT";
  method: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  tenantId: string;
  tenantName: string;
  providerReference: string;
  amount: number;
  currency: string;
  providerFee: number;
  createdAt: Date;
}

/** Filtre commun : une entreprise précise, ou toutes. */
export interface SupervisionFilter {
  tenantId?: string;
}

/** Plafond de lignes renvoyées par liste (les plus récentes) : la recherche et le tri se font côté écran. */
export const SUPERVISION_MAX_ROWS = 500;

/** Langue source d'abord, puis langues traduites, sans doublon. */
export function mergeLocales(sourceLocale: string, translated: readonly string[]): string[] {
  return [...new Set([sourceLocale, ...translated])];
}
