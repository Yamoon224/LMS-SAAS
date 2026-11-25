import { z } from "zod";

/** Doit rester cohérent avec EnrollmentStatus (backend/.../enrollments/domain/enrollment-status.ts). */
export const enrollmentStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING_VALIDATION",
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "SUSPENDED",
  "REFUSED",
]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: "En attente de paiement",
  PENDING_VALIDATION: "En attente de validation",
  ACTIVE: "Active",
  COMPLETED: "Terminée",
  EXPIRED: "Expirée",
  SUSPENDED: "Suspendue",
  REFUSED: "Refusée",
};

/**
 * Transitions autorisées (section 8.1, voir enrollment-status.ts côté backend) :
 * En attente (paiement/validation) → Active | Refusée ; Active → Terminée | Expirée | Suspendue ;
 * Suspendue → Active ; Terminée/Expirée/Refusée → (aucune, états terminaux).
 * Dupliquée côté front pour piloter l'affichage des actions disponibles — le backend reste la
 * source de vérité et rejette toute transition invalide (même discipline que les formations).
 */
export const ALLOWED_ENROLLMENT_STATUS_TRANSITIONS: Record<EnrollmentStatus, EnrollmentStatus[]> = {
  PENDING_PAYMENT: ["ACTIVE", "REFUSED"],
  PENDING_VALIDATION: ["ACTIVE", "REFUSED"],
  ACTIVE: ["COMPLETED", "EXPIRED", "SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  COMPLETED: [],
  EXPIRED: [],
  REFUSED: [],
};

/** Item de liste : GET /business/enrollments?courseId=... renvoie un DTO aplati. */
export const enrollmentListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  learnerName: z.string().nullish(),
  email: z.string().nullish(),
  status: enrollmentStatusSchema,
  pricePaid: z.number(),
  expiresAt: z.coerce.date().nullish(),
  refusalReason: z.string().nullish(),
  manualEnrollmentNote: z.string().nullish(),
});
export type EnrollmentListItem = z.infer<typeof enrollmentListItemSchema>;

/** Fiche d'inscription : GET /business/enrollments/:enrollmentId. */
export const enrollmentDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  learnerName: z.string().nullish(),
  email: z.string().nullish(),
  courseId: z.string(),
  status: enrollmentStatusSchema,
  pricePaid: z.number(),
  expiresAt: z.coerce.date().nullish(),
  refusalReason: z.string().nullish(),
  manualEnrollmentNote: z.string().nullish(),
  progress: z.object({
    totalLessons: z.number(),
    completedLessons: z.number(),
  }),
});
export type EnrollmentDetail = z.infer<typeof enrollmentDetailSchema>;

/** Doit rester cohérent avec ValidateOfflinePaymentDto (ENT-61/RG-07). */
export const validateOfflinePaymentSchema = z.object({
  reference: z.string().min(1, "Référence requise.").max(200),
  declaredAmount: z.coerce.number().int().min(1, "Montant déclaré requis."),
});
export type ValidateOfflinePaymentValues = z.infer<typeof validateOfflinePaymentSchema>;

/** Doit rester cohérent avec RejectOfflinePaymentDto (ENT-61) : motif obligatoire, 500 caractères au plus. */
export const rejectOfflinePaymentSchema = z.object({
  reason: z.string().trim().min(1, "Le motif est obligatoire.").max(500, "500 caractères au maximum."),
});
export type RejectOfflinePaymentValues = z.infer<typeof rejectOfflinePaymentSchema>;

/**
 * Doit rester cohérent avec ManualEnrollmentDto (ENT-62). Prénom et nom ne sont exigés que pour inviter un apprenant
 * inconnu : ils sont facultatifs ici, le backend répond si le compte n'existe pas.
 */
export const manualEnrollmentSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254),
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  reason: z.string().trim().min(1, "Le motif est obligatoire.").max(500, "500 caractères au maximum."),
});
export type ManualEnrollmentValues = z.infer<typeof manualEnrollmentSchema>;

/** Corps envoyé : champs de nom omis s'ils sont vides (apprenant déjà connu). */
export function toManualEnrollmentBody(courseId: string, values: ManualEnrollmentValues) {
  return {
    courseId,
    email: values.email,
    reason: values.reason,
    ...(values.firstName ? { firstName: values.firstName } : {}),
    ...(values.lastName ? { lastName: values.lastName } : {}),
  };
}

/** Le refus ne s'applique qu'à un paiement hors plateforme en attente de validation (ENT-61). */
export function canRejectOfflinePayment(status: EnrollmentStatus): boolean {
  return status === "PENDING_VALIDATION";
}

/** Doit rester cohérent avec ExtendAccessDto (ENT-64). */
export const extendAccessSchema = z.object({
  additionalDays: z.coerce.number().int().min(1, "Au moins 1 jour."),
});
export type ExtendAccessValues = z.infer<typeof extendAccessSchema>;

/** Libellé lisible d'un apprenant : nom, sinon e-mail, sinon identifiant court. */
export function learnerLabel(item: { userId: string; learnerName?: string | null; email?: string | null }): string {
  if (item.learnerName) return item.learnerName;
  if (item.email) return item.email;
  return item.userId.length > 12 ? `${item.userId.slice(0, 8)}…${item.userId.slice(-4)}` : item.userId;
}
