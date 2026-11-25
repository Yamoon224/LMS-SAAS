import { z } from "zod";

/** GET /admin/notification-templates (backend/.../notifications/application/manage-notification-templates.use-cases.ts). */
export const notificationTemplateSchema = z.object({
  templateKey: z.string(),
  locale: z.string(),
  variables: z.string().array(),
  requiredVariables: z.string().array(),
  subject: z.string(),
  body: z.string(),
  isCustomized: z.boolean(),
  defaultSubject: z.string(),
  defaultBody: z.string(),
  updatedAt: z.coerce.date().nullable(),
});
export type NotificationTemplate = z.infer<typeof notificationTemplateSchema>;

/** Doit rester cohérent avec les limites du backend (domain/template-overrides.ts). */
export const SUBJECT_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 10_000;

export const templateFormSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Le sujet est obligatoire.")
    .max(SUBJECT_MAX_LENGTH, `${SUBJECT_MAX_LENGTH} caractères maximum.`)
    .refine((value) => !/[\r\n]/.test(value), "Le sujet doit tenir sur une seule ligne."),
  body: z.string().trim().min(1, "Le contenu est obligatoire.").max(BODY_MAX_LENGTH, "Contenu trop long."),
});
export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const TEMPLATE_LABELS: Record<string, { label: string; description: string }> = {
  "user.invited": { label: "Invitation / activation de compte", description: "Envoyé à un nouvel utilisateur invité." },
  "user.password-reset": { label: "Réinitialisation du mot de passe", description: "Envoyé après « mot de passe oublié »." },
  "payment.failed": { label: "Échec de paiement", description: "Envoyé au propriétaire d'une entreprise." },
  "subscription.renewal-reminder-due": { label: "Rappel de renouvellement", description: "Avant l'échéance de l'abonnement." },
  "subscription.entered-grace-period": { label: "Période de grâce", description: "Après un renouvellement échoué." },
  "subscription.expired": { label: "Abonnement expiré", description: "Accès suspendu." },
  "subscription.renewal-payment-link": { label: "Lien de paiement du renouvellement", description: "Lien pour régler le renouvellement de l'abonnement." },
  "subscription.renewed": { label: "Abonnement renouvelé", description: "Confirmation après un renouvellement réussi." },
  "subscription.period-extended": { label: "Abonnement prolongé", description: "Envoyé quand l'Admin prolonge la période d'un abonnement." },
  "subscription.discount-applied": { label: "Remise appliquée", description: "Envoyé quand l'Admin accorde une remise sur l'abonnement." },
  "subscription.plan-offered": { label: "Plan offert", description: "Envoyé quand l'Admin offre un plan sans paiement." },
  "subscription.prorata-payment-link": { label: "Paiement du prorata (changement de plan)", description: "Lien pour régler le complément après un changement de plan." },
  "payout.executed": { label: "Reversement exécuté", description: "Envoyé à l'entreprise." },
  "refund.requested": { label: "Demande de remboursement", description: "Envoyé à l'entreprise lorsqu'un apprenant demande un remboursement." },
  "refund.accepted": { label: "Remboursement accepté", description: "Envoyé à l'apprenant." },
  "refund.rejected": { label: "Remboursement refusé", description: "Envoyé à l'apprenant avec le motif." },
  "refund.refunded": { label: "Remboursement effectué", description: "Envoyé à l'apprenant." },
  "certificate.issued": { label: "Certificat délivré", description: "Envoyé à l'apprenant." },
  "attestation.issued": { label: "Attestation de suivi délivrée", description: "Envoyé à l'apprenant avec le lien de téléchargement." },
  "enrollment.activated": { label: "Inscription confirmée", description: "Envoyé à l'apprenant." },
  "enrollment.refused": { label: "Inscription refusée", description: "Envoyé à l'apprenant avec le motif du refus." },
  "enrollment.inactivity-reminder": { label: "Rappel d'inactivité", description: "Envoyé à l'apprenant qui n'a pas progressé depuis plusieurs jours." },
  "live-session.scheduled": { label: "Session live planifiée", description: "Envoyé aux apprenants inscrits." },
};

/** Libellé français d'un modèle ; une clé inconnue (nouveau modèle côté backend) est lisible plutôt que brute. */
export function templateInfo(templateKey: string): { label: string; description: string } {
  const known = TEMPLATE_LABELS[templateKey];
  if (known) return known;
  const readable = templateKey.replace(/[.-]+/g, " ");
  return { label: readable.charAt(0).toUpperCase() + readable.slice(1), description: "" };
}

export const LOCALE_LABELS: Record<string, string> = { fr: "Français", en: "English" };
