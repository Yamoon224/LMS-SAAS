/**
 * ADM-10 : fiche 360° d'une entreprise (lecture seule). Types volontairement plats ; aucun secret (coordonnées de
 * reversement, jetons, charges brutes de fournisseur) n'est jamais exposé.
 */

export interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  statusReason: string | null;
  country: string;
  currency: string;
  defaultLocale: string;
  contactEmail: string | null;
  contactPhone: string | null;
  offlinePaymentEnabled: boolean;
  payoutAccountVerified: boolean;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface TenantContact {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
}

export interface TenantSubscriptionRow {
  id: string;
  planName: string;
  period: "MONTHLY" | "QUARTERLY" | "YEARLY";
  amount: number;
  currency: string;
  status: "PENDING_PAYMENT" | "TRIALING" | "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELED" | "SUSPENDED";
  autoRenew: boolean;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  /** ADM-09 : remise Admin en cours (pourcentage OU montant) et plan offert. */
  discountPercent: number | null;
  discountAmount: number | null;
  discountPeriodsRemaining: number | null;
  isComplimentary: boolean;
  /** Quotas du plan (JSON brut `Plan.quotas`) : lu uniquement pour l'abonnement courant. */
  quotas: unknown;
}

export interface TenantUsageCounts {
  courses: number;
  publishedCourses: number;
  activeLearners: number;
  totalLearners: number;
  managers: number;
  storageBytes: number;
  liveSessionsThisMonth: number;
  creditsBalance: number;
  lastActivityAt: Date | null;
}

export interface QuotaUsage {
  key: "maxCourses" | "maxActiveLearners" | "maxManagers" | "storageGb" | "liveSessionsPerMonth";
  label: string;
  /** null = illimité. */
  limit: number | null;
  used: number;
  unit: string | null;
  /** Part consommée en % (null si illimité) ; peut dépasser 100. */
  percent: number | null;
}

export interface TenantUser {
  id: string;
  fullName: string;
  email: string;
  type: "COMPANY_USER" | "LEARNER" | "PLATFORM_ADMIN";
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
  roles: string[];
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** État du lien d'activation envoyé à un propriétaire (le lien lui-même n'est jamais exposé : seul son hash existe). */
export type InvitationState = "PENDING" | "ACTIVATED" | "EXPIRED" | "NOT_INVITED";

/** E-mail d'invitation tel qu'il a été envoyé ; le jeton du lien est masqué. */
export interface InvitationMessage {
  channel: string;
  subject: string;
  body: string;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
}

/** E-mail d'invitation non rendu, tel que stocké (gabarit + charge) : rendu par le cas d'usage. */
export interface InvitationMessageRecord {
  channel: string;
  locale: string;
  payload: Record<string, unknown>;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
}

export type TenantInvitationRecord = Omit<TenantInvitation, "message"> & { message: InvitationMessageRecord | null };

/** ADM-10 : invitation envoyée à un propriétaire à la création de l'entreprise. */
export interface TenantInvitation {
  recipient: { userId: string; fullName: string; email: string };
  state: InvitationState;
  issuedAt: Date | null;
  expiresAt: Date | null;
  consumedAt: Date | null;
  message: InvitationMessage | null;
}

export interface TenantOverview {
  tenant: TenantProfile;
  branding: { logoUrl: string | null; primaryColor: string | null; bannerUrl: string | null; description: string | null };
  contacts: TenantContact[];
  subscription: { current: Omit<TenantSubscriptionRow, "quotas"> | null; history: Omit<TenantSubscriptionRow, "quotas">[] };
  usage: {
    quotas: QuotaUsage[];
    courses: number;
    publishedCourses: number;
    activeLearners: number;
    totalLearners: number;
    creditsBalance: number;
    lastActivityAt: Date | null;
  };
}

export interface TenantFinanceSummary {
  currency: string;
  /** Écritures du compte entreprise : crédits − débits (solde comptable, pas le disponible au reversement). */
  ledgerBalance: number;
  succeededPaymentsAmount: number;
  failedPaymentsCount: number;
  executedPayoutsAmount: number;
  refundedAmount: number;
}

export interface TenantFinances {
  summary: TenantFinanceSummary;
  payments: {
    id: string;
    type: "SUBSCRIPTION" | "CREDIT_PURCHASE" | "COURSE_ENROLLMENT";
    method: string;
    amount: number;
    currency: string;
    status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
    providerReference: string;
    createdAt: Date;
  }[];
  payouts: {
    id: string;
    amount: number;
    currency: string;
    status: "REQUESTED" | "VALIDATED" | "APPROVED" | "EXECUTED" | "REJECTED";
    requestedAt: Date;
    executedAt: Date | null;
  }[];
  refunds: {
    id: string;
    amount: number;
    status: "REQUESTED" | "ACCEPTED" | "REFUNDED" | "REJECTED";
    reason: string | null;
    requestedAt: Date;
    resolvedAt: Date | null;
  }[];
}

export interface TenantAuditEntry {
  id: string;
  action: string;
  objectType: string;
  objectId: string;
  actorName: string | null;
  createdAt: Date;
}

/** Nombre de lignes récentes par liste (paiements, reversements, remboursements, audit, abonnements). */
export const TENANT_OVERVIEW_ROW_LIMIT = 20;
export const TENANT_AUDIT_LIMIT = 100;
/** Plafond de comptes internes listés (les apprenants ne sont que comptés). */
export const TENANT_USERS_LIMIT = 200;

const QUOTA_DEFINITIONS: readonly { key: QuotaUsage["key"]; label: string; unit: string | null }[] = [
  { key: "maxCourses", label: "Formations", unit: null },
  { key: "maxActiveLearners", label: "Apprenants actifs", unit: null },
  { key: "maxManagers", label: "Gestionnaires", unit: null },
  { key: "storageGb", label: "Stockage", unit: "Go" },
  { key: "liveSessionsPerMonth", label: "Sessions live ce mois-ci", unit: null },
];

const BYTES_PER_GB = 1024 * 1024 * 1024;

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Compare l'usage aux quotas du plan courant. Quota absent ou non numérique = illimité (même règle que
 * `PlanQuotaPrismaRepository`) ; sans abonnement courant (`quotas` null), tout est présenté comme illimité.
 */
export function buildQuotaUsage(quotas: unknown, usage: TenantUsageCounts): QuotaUsage[] {
  const record = typeof quotas === "object" && quotas !== null ? (quotas as Record<string, unknown>) : {};
  const used: Record<QuotaUsage["key"], number> = {
    maxCourses: usage.courses,
    maxActiveLearners: usage.activeLearners,
    maxManagers: usage.managers,
    storageGb: roundOne(usage.storageBytes / BYTES_PER_GB),
    liveSessionsPerMonth: usage.liveSessionsThisMonth,
  };

  return QUOTA_DEFINITIONS.map(({ key, label, unit }) => {
    const raw = record[key];
    const limit = typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : null;
    const percent = limit === null ? null : limit === 0 ? (used[key] > 0 ? 100 : 0) : Math.round((used[key] / limit) * 100);
    return { key, label, limit, used: used[key], unit, percent };
  });
}
