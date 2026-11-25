import { z } from "zod";

import { tenantStatusSchema } from "./tenant.schema";

import { billingPeriodSchema } from "@/features/plans/schemas/plan.schema";
import { subscriptionStatusSchema } from "@/features/subscriptions/schemas/subscription.schema";

const userStatusSchema = z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"]);
export type UserStatusValue = z.infer<typeof userStatusSchema>;

/** Doit rester cohérent avec TenantOverview (backend/.../analytics/domain/tenant-overview.ts). */
const subscriptionRowSchema = z.object({
  id: z.string(),
  planName: z.string(),
  period: billingPeriodSchema,
  amount: z.number(),
  currency: z.string(),
  status: subscriptionStatusSchema,
  autoRenew: z.boolean(),
  startedAt: z.coerce.date().nullable(),
  currentPeriodEnd: z.coerce.date().nullable(),
  graceEndsAt: z.coerce.date().nullable(),
  canceledAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  /** ADM-09 : remise Admin en cours et plan offert (absents d'un backend plus ancien : valeurs neutres). */
  discountPercent: z.number().nullable().default(null),
  discountAmount: z.number().nullable().default(null),
  discountPeriodsRemaining: z.number().nullable().default(null),
  isComplimentary: z.boolean().default(false),
});
export type TenantSubscriptionRow = z.infer<typeof subscriptionRowSchema>;

export const quotaUsageSchema = z.object({
  key: z.string(),
  label: z.string(),
  limit: z.number().nullable(),
  used: z.number(),
  unit: z.string().nullable(),
  percent: z.number().nullable(),
});
export type QuotaUsage = z.infer<typeof quotaUsageSchema>;

export const tenantOverviewSchema = z.object({
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    status: tenantStatusSchema,
    statusReason: z.string().nullable(),
    country: z.string(),
    currency: z.string(),
    defaultLocale: z.string(),
    contactEmail: z.string().nullable(),
    contactPhone: z.string().nullable(),
    offlinePaymentEnabled: z.boolean(),
    payoutAccountVerified: z.boolean(),
    createdAt: z.coerce.date(),
    archivedAt: z.coerce.date().nullable(),
  }),
  branding: z.object({
    logoUrl: z.string().nullable(),
    primaryColor: z.string().nullable(),
    bannerUrl: z.string().nullable(),
    description: z.string().nullable(),
  }),
  contacts: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
      email: z.string(),
      phone: z.string().nullable(),
      status: userStatusSchema,
    }),
  ),
  subscription: z.object({
    current: subscriptionRowSchema.nullable(),
    history: z.array(subscriptionRowSchema),
  }),
  usage: z.object({
    quotas: z.array(quotaUsageSchema),
    courses: z.number(),
    publishedCourses: z.number(),
    activeLearners: z.number(),
    totalLearners: z.number(),
    creditsBalance: z.number(),
    lastActivityAt: z.coerce.date().nullable(),
  }),
});
export type TenantOverview = z.infer<typeof tenantOverviewSchema>;

export const tenantUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  type: z.string(),
  status: userStatusSchema,
  roles: z.array(z.string()),
  twoFactorEnabled: z.boolean(),
  lastLoginAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type TenantUser = z.infer<typeof tenantUserSchema>;

export const tenantFinancesSchema = z.object({
  summary: z.object({
    currency: z.string(),
    ledgerBalance: z.number(),
    succeededPaymentsAmount: z.number(),
    failedPaymentsCount: z.number(),
    executedPayoutsAmount: z.number(),
    refundedAmount: z.number(),
  }),
  payments: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["SUBSCRIPTION", "CREDIT_PURCHASE", "COURSE_ENROLLMENT"]),
      method: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]),
      providerReference: z.string(),
      createdAt: z.coerce.date(),
    }),
  ),
  payouts: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      status: z.enum(["REQUESTED", "VALIDATED", "APPROVED", "EXECUTED", "REJECTED"]),
      requestedAt: z.coerce.date(),
      executedAt: z.coerce.date().nullable(),
    }),
  ),
  refunds: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      status: z.enum(["REQUESTED", "ACCEPTED", "REFUNDED", "REJECTED"]),
      reason: z.string().nullable(),
      requestedAt: z.coerce.date(),
      resolvedAt: z.coerce.date().nullable(),
    }),
  ),
});
export type TenantFinances = z.infer<typeof tenantFinancesSchema>;

export const tenantAuditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  objectType: z.string(),
  objectId: z.string(),
  actorName: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type TenantAuditEntry = z.infer<typeof tenantAuditEntrySchema>;

export const USER_STATUS_LABELS: Record<UserStatusValue, string> = {
  ACTIVE: "Actif",
  INVITED: "Invité",
  SUSPENDED: "Suspendu",
  DEACTIVATED: "Désactivé",
};

export const USER_STATUS_VARIANTS: Record<UserStatusValue, "success" | "warning" | "danger" | "secondary"> = {
  ACTIVE: "success",
  INVITED: "warning",
  SUSPENDED: "danger",
  DEACTIVATED: "secondary",
};

export const PAYMENT_STATUS_LABELS: Record<TenantFinances["payments"][number]["status"], string> = {
  PENDING: "En attente",
  SUCCEEDED: "Réussi",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  PARTIALLY_REFUNDED: "Partiellement remboursé",
};

export const PAYMENT_TYPE_LABELS: Record<TenantFinances["payments"][number]["type"], string> = {
  SUBSCRIPTION: "Abonnement",
  CREDIT_PURCHASE: "Crédits IA",
  COURSE_ENROLLMENT: "Inscription",
};

export const PAYOUT_STATUS_LABELS: Record<TenantFinances["payouts"][number]["status"], string> = {
  REQUESTED: "Demandé",
  VALIDATED: "Validé",
  APPROVED: "Approuvé",
  EXECUTED: "Exécuté",
  REJECTED: "Rejeté",
};

export const REFUND_STATUS_LABELS: Record<TenantFinances["refunds"][number]["status"], string> = {
  REQUESTED: "Demandé",
  ACCEPTED: "Accepté",
  REFUNDED: "Remboursé",
  REJECTED: "Refusé",
};

export type QuotaTone = "ok" | "warning" | "danger" | "unlimited";

/** Seuil d'alerte d'un quota : orange à 80 %, rouge à 100 % (quota atteint ou dépassé). */
export const QUOTA_WARNING_PERCENT = 80;

export function quotaTone(percent: number | null): QuotaTone {
  if (percent === null) return "unlimited";
  if (percent >= 100) return "danger";
  if (percent >= QUOTA_WARNING_PERCENT) return "warning";
  return "ok";
}

/** « 8 / 10 », « 1,5 / 3 Go » ou « 8 (illimité) ». */
export function formatQuotaValue(quota: Pick<QuotaUsage, "limit" | "used" | "unit">): string {
  const format = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
  const unit = quota.unit ? ` ${quota.unit}` : "";
  return quota.limit === null
    ? `${format(quota.used)}${unit} (illimité)`
    : `${format(quota.used)} / ${format(quota.limit)}${unit}`;
}

/** Une action du journal (« tenant.suspended ») en libellé lisible, sans perdre le code technique. */
export function humanizeAuditAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export const invitationStateSchema = z.enum(["PENDING", "ACTIVATED", "EXPIRED", "NOT_INVITED"]);
export type InvitationState = z.infer<typeof invitationStateSchema>;

/** Doit rester cohérent avec TenantInvitation (backend/.../analytics/domain/tenant-overview.ts). */
export const tenantInvitationSchema = z.object({
  recipient: z.object({ userId: z.string(), fullName: z.string(), email: z.string() }),
  state: invitationStateSchema,
  issuedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  consumedAt: z.coerce.date().nullable(),
  message: z
    .object({
      channel: z.string(),
      subject: z.string(),
      body: z.string(),
      status: z.string(),
      sentAt: z.coerce.date().nullable(),
      errorMessage: z.string().nullable(),
    })
    .nullable(),
});
export type TenantInvitation = z.infer<typeof tenantInvitationSchema>;

export const INVITATION_STATE_LABELS: Record<InvitationState, string> = {
  PENDING: "En attente d’activation",
  ACTIVATED: "Compte activé",
  EXPIRED: "Lien expiré",
  NOT_INVITED: "Sans invitation",
};

export const INVITATION_STATE_VARIANTS: Record<InvitationState, "warning" | "success" | "danger" | "secondary"> = {
  PENDING: "warning",
  ACTIVATED: "success",
  EXPIRED: "danger",
  NOT_INVITED: "secondary",
};
