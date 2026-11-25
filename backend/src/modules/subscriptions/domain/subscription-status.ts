/**
 * Cycle de vie d'un abonnement (section 8.1):
 * En attente de paiement → (En essai) → Actif → En période de grâce → Expiré ;
 * Actif → Résilié (fin à l'échéance) ; tout statut → Suspendu (par l'Admin).
 */
export enum SubscriptionStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  TRIALING = "TRIALING",
  ACTIVE = "ACTIVE",
  GRACE_PERIOD = "GRACE_PERIOD",
  EXPIRED = "EXPIRED",
  CANCELED = "CANCELED",
  SUSPENDED = "SUSPENDED",
}

/** RG-01: une entreprise est opérationnelle avec un abonnement actif, en essai ou en grâce. */
export const OPERATIONAL_STATUSES: readonly SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.GRACE_PERIOD,
];

export function isOperationalStatus(status: SubscriptionStatus): boolean {
  return OPERATIONAL_STATUSES.includes(status);
}
