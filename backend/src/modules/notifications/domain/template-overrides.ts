import { DomainError } from "@shared/errors";

import type { RenderedTemplate } from "./notification-template";

/**
 * ADM-38 : modèles d'e-mails modifiables par l'Admin. Les textes d'origine restent dans le code ; une surcharge
 * remplace sujet et corps pour une langue, avec une syntaxe `{{variable}}`. Fonctions pures (section 13.1).
 */

/** Langues pour lesquelles des gabarits d'origine existent (donc surchargeables). */
export const OVERRIDABLE_LOCALES = ["fr", "en"] as const;
export type OverridableLocale = (typeof OVERRIDABLE_LOCALES)[number];

export function isOverridableLocale(value: string): value is OverridableLocale {
  return (OVERRIDABLE_LOCALES as readonly string[]).includes(value);
}

/** Variables propres à chaque gabarit ; `firstName` est toujours disponible. */
const TEMPLATE_VARIABLES: Record<string, readonly string[]> = {
  "user.invited": ["activationUrl"],
  "user.password-reset": ["resetUrl"],
  "payment.failed": ["amount", "currency"],
  "subscription.renewal-reminder-due": ["daysUntilRenewal", "currentPeriodEnd"],
  "subscription.entered-grace-period": ["graceEndsAt"],
  "subscription.expired": [],
  "subscription.renewal-payment-link": ["amount", "currency", "paymentUrl", "dueDate"],
  "subscription.renewed": ["newPeriodEnd"],
  "subscription.period-extended": ["newPeriodEnd"],
  "subscription.discount-applied": ["discount", "periods"],
  "subscription.plan-offered": ["planName", "periodEnd"],
  "subscription.prorata-payment-link": ["amount", "currency", "paymentUrl"],
  "payout.executed": ["amount", "currency"],
  "refund.requested": ["courseTitle", "amount", "currency"],
  "refund.accepted": ["courseTitle", "amount", "currency"],
  "refund.rejected": ["courseTitle", "note"],
  "refund.refunded": ["courseTitle", "amount", "currency"],
  "certificate.issued": ["courseTitle", "downloadUrl"],
  "attestation.issued": ["courseTitle", "downloadUrl"],
  "enrollment.activated": ["courseTitle"],
  "enrollment.inactivity-reminder": ["courseTitle", "daysInactive"],
  "enrollment.refused": ["courseTitle", "reason"],
  "live-session.scheduled": ["sessionTitle", "startAt", "meetLink"],
};

/**
 * Variables qui doivent figurer dans le corps : sans elles le message ne sert plus à rien (lien d'activation,
 * de réinitialisation, de téléchargement ou de connexion absent).
 */
const REQUIRED_VARIABLES: Record<string, readonly string[]> = {
  "user.invited": ["activationUrl"],
  "user.password-reset": ["resetUrl"],
  "certificate.issued": ["downloadUrl"],
  "attestation.issued": ["downloadUrl"],
  "live-session.scheduled": ["meetLink"],
  "subscription.renewal-payment-link": ["paymentUrl"],
  "subscription.prorata-payment-link": ["paymentUrl"],
};

export const SUBJECT_MAX_LENGTH = 200;
export const BODY_MAX_LENGTH = 10_000;

export class TemplateOverrideInvalidError extends DomainError {
  readonly code = "MODELE_NOTIFICATION_INVALIDE";
}

export class TemplateUnknownError extends DomainError {
  readonly code = "MODELE_NOTIFICATION_INCONNU";
}

export function knownTemplateKeys(): string[] {
  return Object.keys(TEMPLATE_VARIABLES);
}

export function isKnownTemplate(templateKey: string): boolean {
  return templateKey in TEMPLATE_VARIABLES;
}

export function allowedVariables(templateKey: string): string[] {
  return ["firstName", ...(TEMPLATE_VARIABLES[templateKey] ?? [])];
}

export function requiredVariables(templateKey: string): string[] {
  return [...(REQUIRED_VARIABLES[templateKey] ?? [])];
}

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/g;

export function extractVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map((match) => match[1] ?? ""))];
}

/**
 * Valide une surcharge : sujet sur une seule ligne (un saut de ligne permettrait d'injecter des en-têtes d'e-mail),
 * tailles bornées, uniquement des variables connues du gabarit, variables vitales présentes dans le corps.
 */
export function validateOverride(templateKey: string, subject: string, body: string): void {
  if (!isKnownTemplate(templateKey)) {
    throw new TemplateUnknownError(`Modèle de notification inconnu: ${templateKey}`);
  }
  if (!subject.trim() || !body.trim()) {
    throw new TemplateOverrideInvalidError("Le sujet et le contenu sont obligatoires.");
  }
  if (/[\r\n]/.test(subject)) {
    throw new TemplateOverrideInvalidError("Le sujet doit tenir sur une seule ligne.");
  }
  if (subject.length > SUBJECT_MAX_LENGTH || body.length > BODY_MAX_LENGTH) {
    throw new TemplateOverrideInvalidError("Le sujet ou le contenu est trop long.");
  }

  const allowed = new Set(allowedVariables(templateKey));
  const unknown = [...extractVariables(subject), ...extractVariables(body)].filter((name) => !allowed.has(name));
  if (unknown.length > 0) {
    throw new TemplateOverrideInvalidError(
      `Variable(s) inconnue(s) pour ce modèle : ${[...new Set(unknown)].join(", ")}. Disponibles : ${[...allowed].join(", ")}.`,
    );
  }

  const bodyVariables = new Set(extractVariables(body));
  const missing = requiredVariables(templateKey).filter((name) => !bodyVariables.has(name));
  if (missing.length > 0) {
    throw new TemplateOverrideInvalidError(
      `Le contenu doit contenir ${missing.map((name) => `{{${name}}}`).join(", ")} : sans cela le message est inutilisable.`,
    );
  }
}

/** Remplace `{{variable}}` par sa valeur ; une variable absente du payload devient vide. Jamais d'évaluation de code. */
export function interpolate(text: string, payload: Record<string, unknown>): string {
  return text.replace(VARIABLE_PATTERN, (_match, name: string) => {
    const value = payload[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Payload dont chaque variable vaut son propre marqueur `{{variable}}` : sert à afficher le texte d'origine tel quel. */
export function placeholderPayload(templateKey: string): Record<string, string> {
  return Object.fromEntries(allowedVariables(templateKey).map((name) => [name, `{{${name}}}`]));
}

/** Rend une surcharge avec les données de la notification (même résultat que le rendu d'un gabarit d'origine). */
export function renderOverride(
  override: { subject: string; body: string },
  payload: Record<string, unknown>,
): RenderedTemplate {
  return { subject: interpolate(override.subject, payload), body: interpolate(override.body, payload) };
}
