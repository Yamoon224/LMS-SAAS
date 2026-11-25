export interface RenderedTemplate {
  subject: string;
  body: string;
}

export type TemplateRenderer = (payload: Record<string, unknown>) => RenderedTemplate;

/**
 * Registre des gabarits de notification (section 12.7). Fonction pure
 * (section 13.1) : aucune dépendance à un moteur de templating externe —
 * chaque gabarit est une simple interpolation de chaîne, largement
 * suffisante pour les messages courts envoyés par ce module. `fr` est la
 * langue de repli si la langue demandée n'a pas de gabarit dédié.
 */
const TEMPLATES: Record<string, Record<string, TemplateRenderer>> = {
  "user.invited": {
    fr: (p) => ({
      subject: "Votre accès à la plateforme",
      body: `Bonjour ${p.firstName}, votre compte a été créé. Activez-le ici : ${p.activationUrl}`,
    }),
    en: (p) => ({
      subject: "Your platform access",
      body: `Hello ${p.firstName}, your account has been created. Activate it here: ${p.activationUrl}`,
    }),
  },
  "user.password-reset": {
    fr: (p) => ({
      subject: "Réinitialisation de votre mot de passe",
      body: `Vous avez demandé à réinitialiser votre mot de passe. Choisissez-en un nouveau ici (lien valable 1 heure) : ${p.resetUrl}. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    }),
    en: (p) => ({
      subject: "Reset your password",
      body: `You asked to reset your password. Choose a new one here (link valid for 1 hour): ${p.resetUrl}. If you did not request this, ignore this message.`,
    }),
  },
  "payment.failed": {
    fr: (p) => ({
      subject: "Échec de paiement",
      body: `Le paiement de ${p.amount} ${p.currency} a échoué. Merci de réessayer ou de contacter le support.`,
    }),
    en: (p) => ({
      subject: "Payment failed",
      body: `The payment of ${p.amount} ${p.currency} has failed. Please retry or contact support.`,
    }),
  },
  "subscription.renewal-reminder-due": {
    fr: (p) => ({
      subject: "Votre abonnement arrive à échéance",
      body: `Votre abonnement se renouvelle dans ${p.daysUntilRenewal} jour(s) (le ${p.currentPeriodEnd}).`,
    }),
    en: (p) => ({
      subject: "Your subscription is due for renewal",
      body: `Your subscription renews in ${p.daysUntilRenewal} day(s) (on ${p.currentPeriodEnd}).`,
    }),
  },
  "subscription.entered-grace-period": {
    fr: (p) => ({
      subject: "Problème de paiement sur votre abonnement",
      body: `Le renouvellement a échoué. Vous disposez d'un délai de grâce jusqu'au ${p.graceEndsAt} pour régulariser.`,
    }),
    en: (p) => ({
      subject: "Payment issue on your subscription",
      body: `Renewal failed. You have a grace period until ${p.graceEndsAt} to settle payment.`,
    }),
  },
  "subscription.expired": {
    fr: () => ({
      subject: "Abonnement expiré",
      body: "Votre abonnement a expiré et l'accès à la plateforme est suspendu. Contactez le support pour le réactiver.",
    }),
    en: () => ({
      subject: "Subscription expired",
      body: "Your subscription has expired and platform access is suspended. Contact support to reactivate it.",
    }),
  },
  "subscription.renewal-payment-link": {
    fr: (p) => ({
      subject: "Renouvelez votre abonnement",
      body: `Votre abonnement arrive à échéance${p.dueDate ? ` (${p.dueDate})` : ""}. Réglez ${p.amount} ${p.currency} ici pour le renouveler : ${p.paymentUrl}`,
    }),
    en: (p) => ({
      subject: "Renew your subscription",
      body: `Your subscription is due${p.dueDate ? ` (${p.dueDate})` : ""}. Pay ${p.amount} ${p.currency} here to renew it: ${p.paymentUrl}`,
    }),
  },
  "subscription.renewed": {
    fr: (p) => ({
      subject: "Abonnement renouvelé",
      body: `Votre abonnement a été renouvelé jusqu'au ${p.newPeriodEnd}. Merci !`,
    }),
    en: (p) => ({
      subject: "Subscription renewed",
      body: `Your subscription has been renewed until ${p.newPeriodEnd}. Thank you!`,
    }),
  },
  "subscription.period-extended": {
    fr: (p) => ({
      subject: "Abonnement prolongé",
      body: `Votre abonnement a été prolongé jusqu'au ${p.newPeriodEnd}.`,
    }),
    en: (p) => ({
      subject: "Subscription extended",
      body: `Your subscription has been extended until ${p.newPeriodEnd}.`,
    }),
  },
  "subscription.discount-applied": {
    fr: (p) => ({
      subject: "Remise appliquée à votre abonnement",
      body: `Une remise de ${p.discount} s'appliquera à vos ${p.periods} prochaine(s) période(s) de facturation.`,
    }),
    en: (p) => ({
      subject: "Discount applied to your subscription",
      body: `A discount of ${p.discount} will apply to your next ${p.periods} billing period(s).`,
    }),
  },
  "subscription.plan-offered": {
    fr: (p) => ({
      subject: "Un plan vous est offert",
      body: `Le plan "${p.planName}" vous est offert jusqu'au ${p.periodEnd}, sans paiement. À l'échéance, choisissez un plan pour continuer.`,
    }),
    en: (p) => ({
      subject: "A plan has been offered to you",
      body: `The "${p.planName}" plan is offered to you until ${p.periodEnd}, at no charge. When it ends, choose a plan to continue.`,
    }),
  },
  "subscription.prorata-payment-link": {
    fr: (p) => ({
      subject: "Changement de plan : paiement du prorata",
      body: `Votre changement de plan est effectif. Réglez le complément de ${p.amount} ${p.currency} ici : ${p.paymentUrl}`,
    }),
    en: (p) => ({
      subject: "Plan change: prorated payment",
      body: `Your plan change is effective. Pay the balance of ${p.amount} ${p.currency} here: ${p.paymentUrl}`,
    }),
  },
  "payout.executed": {
    fr: (p) => ({
      subject: "Reversement exécuté",
      body: `Votre reversement de ${p.amount} ${p.currency} a été exécuté.`,
    }),
    en: (p) => ({
      subject: "Payout executed",
      body: `Your payout of ${p.amount} ${p.currency} has been executed.`,
    }),
  },
  "refund.requested": {
    fr: (p) => ({
      subject: "Nouvelle demande de remboursement",
      body: `Un apprenant demande le remboursement de "${p.courseTitle}" (${p.amount} ${p.currency}). Examinez la demande dans la rubrique Remboursements.`,
    }),
    en: (p) => ({
      subject: "New refund request",
      body: `A learner has requested a refund for "${p.courseTitle}" (${p.amount} ${p.currency}). Review it in the Refunds section.`,
    }),
  },
  "refund.accepted": {
    fr: (p) => ({
      subject: "Demande de remboursement acceptée",
      body: `Votre demande de remboursement pour "${p.courseTitle}" a été acceptée. Le remboursement de ${p.amount} ${p.currency} va être exécuté.`,
    }),
    en: (p) => ({
      subject: "Refund request accepted",
      body: `Your refund request for "${p.courseTitle}" has been accepted. The refund of ${p.amount} ${p.currency} will be processed.`,
    }),
  },
  "refund.rejected": {
    fr: (p) => ({
      subject: "Demande de remboursement refusée",
      body: `Votre demande de remboursement pour "${p.courseTitle}" a été refusée. Motif : ${p.note}`,
    }),
    en: (p) => ({
      subject: "Refund request declined",
      body: `Your refund request for "${p.courseTitle}" has been declined. Reason: ${p.note}`,
    }),
  },
  "refund.refunded": {
    fr: (p) => ({
      subject: "Remboursement effectué",
      body: `Le remboursement de ${p.amount} ${p.currency} pour "${p.courseTitle}" a été effectué.`,
    }),
    en: (p) => ({
      subject: "Refund completed",
      body: `The refund of ${p.amount} ${p.currency} for "${p.courseTitle}" has been completed.`,
    }),
  },
  "certificate.issued": {
    fr: (p) => ({
      subject: "Votre certificat est prêt",
      body: `Félicitations ! Votre certificat pour "${p.courseTitle}" est disponible : ${p.downloadUrl}`,
    }),
    en: (p) => ({
      subject: "Your certificate is ready",
      body: `Congratulations! Your certificate for "${p.courseTitle}" is available: ${p.downloadUrl}`,
    }),
  },
  "attestation.issued": {
    fr: (p) => ({
      subject: "Votre attestation de suivi est prête",
      body: `Votre attestation de suivi de "${p.courseTitle}" est disponible : ${p.downloadUrl}`,
    }),
    en: (p) => ({
      subject: "Your attendance certificate is ready",
      body: `Your attendance certificate for "${p.courseTitle}" is available: ${p.downloadUrl}`,
    }),
  },
  "enrollment.activated": {
    fr: (p) => ({
      subject: "Inscription confirmée",
      body: `Votre inscription à "${p.courseTitle}" est confirmée. Bonne formation !`,
    }),
    en: (p) => ({
      subject: "Enrollment confirmed",
      body: `Your enrollment in "${p.courseTitle}" is confirmed. Enjoy your training!`,
    }),
  },
  "enrollment.refused": {
    fr: (p) => ({
      subject: "Inscription refusée",
      body: `Votre inscription à "${p.courseTitle}" n'a pas pu être validée. Motif : ${p.reason}`,
    }),
    en: (p) => ({
      subject: "Enrollment refused",
      body: `Your enrollment in "${p.courseTitle}" could not be validated. Reason: ${p.reason}`,
    }),
  },
  "enrollment.inactivity-reminder": {
    fr: (p) => ({
      subject: "Votre formation vous attend",
      body: `Bonjour ${p.firstName}, vous n'avez pas progressé dans "${p.courseTitle}" depuis ${p.daysInactive} jours. Reprenez là où vous vous êtes arrêté(e) : quelques minutes suffisent !`,
    }),
    en: (p) => ({
      subject: "Your course is waiting for you",
      body: `Hello ${p.firstName}, you have not made progress in "${p.courseTitle}" for ${p.daysInactive} days. Pick up where you left off: a few minutes are enough!`,
    }),
  },
  "live-session.scheduled": {
    fr: (p) => ({
      subject: "Nouvelle session live planifiée",
      body: `"${p.sessionTitle}" est planifiée le ${p.startAt}. Lien de connexion : ${p.meetLink}`,
    }),
    en: (p) => ({
      subject: "New live session scheduled",
      body: `"${p.sessionTitle}" is scheduled for ${p.startAt}. Join link: ${p.meetLink}`,
    }),
  },
};

export function renderTemplate(
  templateKey: string,
  locale: string,
  payload: Record<string, unknown>,
): RenderedTemplate {
  const templatesForKey = TEMPLATES[templateKey];
  if (!templatesForKey) {
    throw new Error(`Gabarit de notification introuvable: ${templateKey}`);
  }

  const renderer = templatesForKey[locale] ?? templatesForKey.fr;
  if (!renderer) {
    throw new Error(`Aucun gabarit disponible (ni "${locale}" ni "fr") pour: ${templateKey}`);
  }

  return renderer(payload);
}

export function hasTemplate(templateKey: string): boolean {
  return templateKey in TEMPLATES;
}
