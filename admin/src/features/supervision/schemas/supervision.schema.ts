import { z } from "zod";

/** Doivent rester cohérents avec backend/.../analytics/domain/supervision.ts. */

export const supervisedCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"]),
  type: z.enum(["CERTIFYING", "NON_CERTIFYING"]),
  locales: z.string().array(),
  price: z.number(),
  currency: z.string(),
  enrollmentsCount: z.number(),
  createdAt: z.coerce.date(),
});
export type SupervisedCourse = z.infer<typeof supervisedCourseSchema>;

export const supervisedLearnerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  tenantId: z.string().nullable(),
  tenantName: z.string(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"]),
  enrollmentsCount: z.number(),
  lastLoginAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type SupervisedLearner = z.infer<typeof supervisedLearnerSchema>;

export const supervisedCertificateSchema = z.object({
  number: z.string(),
  status: z.enum(["VALID", "REVOKED", "REISSUED"]),
  learnerName: z.string(),
  courseTitle: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  scorePercent: z.number().nullable(),
  issuedAt: z.coerce.date(),
  revokedAt: z.coerce.date().nullable(),
});
export type SupervisedCertificate = z.infer<typeof supervisedCertificateSchema>;

export const supervisedTransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["SUBSCRIPTION", "CREDIT_PURCHASE", "COURSE_ENROLLMENT"]),
  method: z.string(),
  status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"]),
  tenantId: z.string(),
  tenantName: z.string(),
  providerReference: z.string(),
  amount: z.number(),
  currency: z.string(),
  providerFee: z.number(),
  createdAt: z.coerce.date(),
});
export type SupervisedTransaction = z.infer<typeof supervisedTransactionSchema>;

export const COURSE_STATUS_LABELS: Record<SupervisedCourse["status"], string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publiée",
  HIDDEN: "Masquée",
  ARCHIVED: "Archivée",
};

export const COURSE_TYPE_LABELS: Record<SupervisedCourse["type"], string> = {
  CERTIFYING: "Certifiante",
  NON_CERTIFYING: "Non certifiante",
};

export const LEARNER_STATUS_LABELS: Record<SupervisedLearner["status"], string> = {
  ACTIVE: "Actif",
  INVITED: "Invité",
  SUSPENDED: "Suspendu",
  DEACTIVATED: "Désactivé",
};

export const CERTIFICATE_STATUS_LABELS: Record<SupervisedCertificate["status"], string> = {
  VALID: "Valide",
  REVOKED: "Révoqué",
  REISSUED: "Réédité",
};

export const TRANSACTION_TYPE_LABELS: Record<SupervisedTransaction["type"], string> = {
  SUBSCRIPTION: "Abonnement",
  CREDIT_PURCHASE: "Crédits IA",
  COURSE_ENROLLMENT: "Vente de formation",
};

export const TRANSACTION_STATUS_LABELS: Record<SupervisedTransaction["status"], string> = {
  PENDING: "En attente",
  SUCCEEDED: "Réussi",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  PARTIALLY_REFUNDED: "Partiellement remboursé",
};
