import type { SubscriptionStatus } from "./domain/subscription-status";

/**
 * Événements de domaine publics du module subscriptions. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class SubscriptionActivatedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
  ) {}
}

export class SubscriptionCreatedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly planPriceId: string,
    public readonly status: SubscriptionStatus,
  ) {}
}

export class PlanChangedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly newPlanPriceId: string,
    public readonly immediate: boolean,
    /** Étape 31 : prorata dû pour une montée en gamme immédiate (plus petite unité), 0 sinon. */
    public readonly prorataAmountDue: number = 0,
    public readonly currency: string | null = null,
  ) {}
}

/** Étape 31 : une descente de gamme planifiée a été annulée par l'entreprise avant son application. */
export class PlanChangeCanceledEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
  ) {}
}

/** Étape 31 : la demande de paiement de renouvellement (lien de paiement) est créée, l'entreprise doit payer. */
export class RenewalPaymentRequestedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly checkoutUrl: string | null,
    public readonly dueDate: Date | null,
  ) {}
}

/** Étape 31 : renouvellement confirmé, nouvelle période en cours. */
export class SubscriptionRenewedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly planPriceId: string,
    public readonly newPeriodEnd: Date,
  ) {}
}

export class SubscriptionEnteredGracePeriodEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly graceEndsAt: Date,
  ) {}
}

export class SubscriptionExpiredEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
  ) {}
}

/** ENT-03: rappel de renouvellement à J-7/J-3/J-1, consommé par le module notifications. */
export class RenewalReminderDueEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly daysUntilRenewal: number,
    public readonly currentPeriodEnd: Date,
  ) {}
}

/** Étape 36 (ADM-09) : l'Admin a prolongé la période courante. Audit + notification au Propriétaire. */
export class SubscriptionPeriodExtendedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly previousPeriodEnd: Date | null,
    public readonly newPeriodEnd: Date,
    public readonly reason: string | null,
  ) {}
}

/** Étape 36 (ADM-09) : remise posée (ou retirée si `periods` vaut 0). Ne porte aucune donnée sensible. */
export class SubscriptionDiscountChangedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly percent: number | null,
    public readonly amount: number | null,
    public readonly periods: number,
    public readonly reason: string | null,
  ) {}
}

/** Étape 36 (ADM-09) : plan offert sans paiement, motif obligatoire (journalisé). */
export class SubscriptionPlanOfferedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly planPriceId: string,
    public readonly periodEnd: Date,
    public readonly reason: string,
    /** Nom du plan offert (pour la notification au Propriétaire). */
    public readonly planName: string = "",
  ) {}
}
