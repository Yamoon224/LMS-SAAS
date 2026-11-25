import { InvalidStateTransitionError } from "@shared/errors";

import { isOperationalStatus, SubscriptionStatus } from "./subscription-status";

export interface SubscriptionProps {
  id: string;
  tenantId: string;
  planPriceId: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  startedAt: Date | null;
  currentPeriodEnd: Date | null;
  graceEndsAt: Date | null;
  canceledAt: Date | null;
  /** Étape 31 : descente de gamme planifiée (appliquée au renouvellement suivant l'échéance). */
  pendingPlanPriceId?: string | null;
  pendingChangeAt?: Date | null;
  /** Étape 31 : échéance pour laquelle un renouvellement a déjà été demandé (idempotence). */
  renewalForPeriodEnd?: Date | null;
  lastRenewalStatus?: RenewalStatus | null;
  lastRenewalAt?: Date | null;
  lastRenewalPaymentId?: string | null;
  lastRenewalCheckoutUrl?: string | null;
  lastRenewalAmount?: number | null;
  /** Étape 36 (ADM-09) : remise Admin (pourcentage OU montant) sur les `discountPeriodsRemaining` prochaines périodes. */
  discountPercent?: number | null;
  discountAmount?: number | null;
  discountPeriodsRemaining?: number | null;
  /** Étape 36 (ADM-09) : plan offert par l'Admin, sans paiement. */
  isComplimentary?: boolean;
}

export type RenewalStatus = "PENDING" | "SUCCEEDED" | "FAILED";

/** Délai minimal entre deux tentatives de renouvellement pendant la période de grâce (relance du lien). */
export const RENEWAL_RETRY_INTERVAL_HOURS = 24;

/** Durée par défaut de la période de grâce (RG-02), en jours. */
export const DEFAULT_GRACE_PERIOD_DAYS = 3;

/**
 * Cycle de vie complet (section 8.1):
 * En attente de paiement → (En essai) → Actif → En période de grâce → Expiré ;
 * Actif → Résilié (fin à l'échéance) ; tout statut → Suspendu (par l'Admin).
 */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.PENDING_PAYMENT]: [
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.SUSPENDED,
  ],
  [SubscriptionStatus.TRIALING]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED],
  [SubscriptionStatus.ACTIVE]: [
    SubscriptionStatus.GRACE_PERIOD,
    SubscriptionStatus.CANCELED,
    SubscriptionStatus.SUSPENDED,
  ],
  [SubscriptionStatus.GRACE_PERIOD]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.SUSPENDED,
  ],
  [SubscriptionStatus.EXPIRED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED],
  [SubscriptionStatus.CANCELED]: [SubscriptionStatus.SUSPENDED],
  [SubscriptionStatus.SUSPENDED]: [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.GRACE_PERIOD,
    SubscriptionStatus.EXPIRED,
    SubscriptionStatus.CANCELED,
  ],
};

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static fromPersistence(props: SubscriptionProps): Subscription {
    return new Subscription({
      ...props,
      pendingPlanPriceId: props.pendingPlanPriceId ?? null,
      pendingChangeAt: props.pendingChangeAt ?? null,
      renewalForPeriodEnd: props.renewalForPeriodEnd ?? null,
      lastRenewalStatus: props.lastRenewalStatus ?? null,
      lastRenewalAt: props.lastRenewalAt ?? null,
      lastRenewalPaymentId: props.lastRenewalPaymentId ?? null,
      lastRenewalCheckoutUrl: props.lastRenewalCheckoutUrl ?? null,
      lastRenewalAmount: props.lastRenewalAmount ?? null,
      discountPercent: props.discountPercent ?? null,
      discountAmount: props.discountAmount ?? null,
      discountPeriodsRemaining: props.discountPeriodsRemaining ?? null,
      isComplimentary: props.isComplimentary ?? false,
    });
  }

  get isComplimentary(): boolean {
    return this.props.isComplimentary ?? false;
  }

  get discountPeriodsRemaining(): number | null {
    return this.props.discountPeriodsRemaining ?? null;
  }

  /** Remise applicable à la prochaine facturation, ou null (aucune remise, ou toutes les périodes consommées). */
  activeDiscount(): { percent: number | null; amount: number | null; periodsRemaining: number } | null {
    const periods = this.props.discountPeriodsRemaining ?? 0;
    const percent = this.props.discountPercent ?? null;
    const amount = this.props.discountAmount ?? null;
    if (periods <= 0 || (percent == null && amount == null)) return null;
    return { percent, amount, periodsRemaining: periods };
  }

  /** ADM-09 : pose (ou remplace) une remise sur les `periods` prochaines périodes. Exactement un de percent/amount. */
  applyDiscount(discount: { percent?: number; amount?: number }, periods: number): void {
    const { percent, amount } = discount;
    if ((percent == null) === (amount == null)) {
      throw new InvalidStateTransitionError("Indiquez un pourcentage ou un montant, pas les deux.");
    }
    if (!Number.isInteger(periods) || periods < 1) {
      throw new InvalidStateTransitionError("La durée de la remise doit être d'au moins une période.");
    }
    if (percent != null && (!Number.isInteger(percent) || percent < 1 || percent > 100)) {
      throw new InvalidStateTransitionError("Le pourcentage de remise doit être compris entre 1 et 100.");
    }
    if (amount != null && (!Number.isInteger(amount) || amount < 1)) {
      throw new InvalidStateTransitionError("Le montant de remise doit être un entier positif.");
    }
    this.props.discountPercent = percent ?? null;
    this.props.discountAmount = amount ?? null;
    this.props.discountPeriodsRemaining = periods;
  }

  clearDiscount(): void {
    this.props.discountPercent = null;
    this.props.discountAmount = null;
    this.props.discountPeriodsRemaining = null;
  }

  /**
   * ADM-09 : prolonge la période courante (abonnement ACTIVE, TRIALING ou en grâce). Une fin antérieure à
   * l'actuelle est refusée. Depuis la grâce, l'abonnement redevient ACTIVE (la grâce n'a plus lieu d'être).
   */
  extendPeriod(newPeriodEnd: Date): void {
    const status = this.props.status;
    if (
      status !== SubscriptionStatus.ACTIVE &&
      status !== SubscriptionStatus.TRIALING &&
      status !== SubscriptionStatus.GRACE_PERIOD
    ) {
      throw new InvalidStateTransitionError(`Impossible de prolonger un abonnement ${status}.`);
    }
    const current = this.props.currentPeriodEnd;
    if (current && newPeriodEnd.getTime() <= current.getTime()) {
      throw new InvalidStateTransitionError("La nouvelle échéance doit être postérieure à l'échéance actuelle.");
    }
    if (status === SubscriptionStatus.GRACE_PERIOD) {
      this.transitionTo(SubscriptionStatus.ACTIVE);
      this.props.graceEndsAt = null;
    }
    this.props.currentPeriodEnd = newPeriodEnd;
  }

  /**
   * ADM-09 : plan offert sans paiement. Remplace le prix, passe ACTIVE jusqu'à `periodEnd`, sans renouvellement
   * automatique : à l'échéance l'abonnement prend fin (cron existant). Toute descente planifiée et toute remise
   * deviennent caduques.
   */
  grantComplimentary(planPriceId: string, periodEnd: Date, now: Date): void {
    if (this.props.status !== SubscriptionStatus.ACTIVE) {
      this.transitionTo(SubscriptionStatus.ACTIVE);
    }
    this.props.startedAt ??= now;
    this.props.planPriceId = planPriceId;
    this.props.pendingPlanPriceId = null;
    this.props.pendingChangeAt = null;
    this.props.currentPeriodEnd = periodEnd;
    this.props.graceEndsAt = null;
    this.props.autoRenew = false;
    this.props.isComplimentary = true;
    this.clearDiscount();
  }

  get pendingPlanPriceId(): string | null {
    return this.props.pendingPlanPriceId ?? null;
  }

  get pendingChangeAt(): Date | null {
    return this.props.pendingChangeAt ?? null;
  }

  get renewalForPeriodEnd(): Date | null {
    return this.props.renewalForPeriodEnd ?? null;
  }

  get lastRenewalStatus(): RenewalStatus | null {
    return this.props.lastRenewalStatus ?? null;
  }

  get lastRenewalAt(): Date | null {
    return this.props.lastRenewalAt ?? null;
  }

  get lastRenewalPaymentId(): string | null {
    return this.props.lastRenewalPaymentId ?? null;
  }

  get lastRenewalCheckoutUrl(): string | null {
    return this.props.lastRenewalCheckoutUrl ?? null;
  }

  get lastRenewalAmount(): number | null {
    return this.props.lastRenewalAmount ?? null;
  }

  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get planPriceId(): string {
    return this.props.planPriceId;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get autoRenew(): boolean {
    return this.props.autoRenew;
  }

  get startedAt(): Date | null {
    return this.props.startedAt;
  }

  get currentPeriodEnd(): Date | null {
    return this.props.currentPeriodEnd;
  }

  get graceEndsAt(): Date | null {
    return this.props.graceEndsAt;
  }

  isOperational(): boolean {
    return isOperationalStatus(this.props.status);
  }

  private transitionTo(status: SubscriptionStatus): void {
    if (!ALLOWED_TRANSITIONS[this.props.status].includes(status)) {
      throw new InvalidStateTransitionError(
        `Transition invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /** ENT-02: activation suite à la confirmation du paiement par le fournisseur. */
  activate(periodEnd: Date): void {
    this.transitionTo(SubscriptionStatus.ACTIVE);
    this.props.startedAt ??= new Date();
    this.props.currentPeriodEnd = periodEnd;
    this.props.graceEndsAt = null;
  }

  /** PROP-26: démarre une période d'essai sans paiement initial. */
  startTrial(trialEnd: Date): void {
    this.transitionTo(SubscriptionStatus.TRIALING);
    this.props.startedAt ??= new Date();
    this.props.currentPeriodEnd = trialEnd;
  }

  /** RG-02: passe en période de grâce après un échec de renouvellement. */
  enterGracePeriod(
    graceDays: number = DEFAULT_GRACE_PERIOD_DAYS,
    now: Date = new Date(),
  ): { graceEndsAt: Date } {
    const graceEndsAt = new Date(now);
    graceEndsAt.setDate(graceEndsAt.getDate() + graceDays);
    this.transitionTo(SubscriptionStatus.GRACE_PERIOD);
    this.props.graceEndsAt = graceEndsAt;
    return { graceEndsAt };
  }

  /** RG-02: passage au statut expiré à la fin de la période de grâce. */
  expire(): void {
    this.transitionTo(SubscriptionStatus.EXPIRED);
  }

  hasGracePeriodElapsed(now: Date = new Date()): boolean {
    return (
      this.props.status === SubscriptionStatus.GRACE_PERIOD &&
      this.props.graceEndsAt !== null &&
      now > this.props.graceEndsAt
    );
  }

  /** ENT-03: la résiliation prend effet à l'échéance (section 8.1), pas immédiatement. */
  cancelAtPeriodEnd(): void {
    this.transitionTo(SubscriptionStatus.CANCELED);
    this.props.autoRenew = false;
    this.props.canceledAt = new Date();
  }

  suspend(): void {
    this.transitionTo(SubscriptionStatus.SUSPENDED);
  }

  /** Montée en gamme immédiate : tout changement planifié devient caduc. */
  changePlanPrice(planPriceId: string): void {
    this.props.planPriceId = planPriceId;
    this.props.pendingPlanPriceId = null;
    this.props.pendingChangeAt = null;
  }

  /** ENT-04: descente de gamme planifiée à l'échéance courante ; remplace une planification précédente. */
  schedulePlanChange(planPriceId: string): void {
    if (!this.props.currentPeriodEnd) {
      throw new InvalidStateTransitionError("Aucune échéance courante : impossible de planifier un changement.");
    }
    this.props.pendingPlanPriceId = planPriceId;
    this.props.pendingChangeAt = this.props.currentPeriodEnd;
  }

  /** Annulation possible tant que le changement n'a pas été appliqué. Retourne false s'il n'y en avait pas. */
  cancelPendingPlanChange(): boolean {
    const had = this.props.pendingPlanPriceId != null;
    this.props.pendingPlanPriceId = null;
    this.props.pendingChangeAt = null;
    return had;
  }

  setAutoRenew(autoRenew: boolean): void {
    this.props.autoRenew = autoRenew;
  }

  /** Prix à facturer au prochain renouvellement : le changement planifié s'il existe, sinon le prix courant. */
  nextPlanPriceId(): string {
    return this.props.pendingPlanPriceId ?? this.props.planPriceId;
  }

  /**
   * Renouvellement : une demande peut être créée si l'abonnement est ACTIVE, à échéance, avec renouvellement
   * automatique, et qu'aucune demande n'existe déjà pour CETTE échéance. En période de grâce, une nouvelle demande
   * n'est possible que si la précédente a échoué depuis au moins 24 h (le paiement échoué ne peut plus aboutir).
   */
  canStartRenewal(now: Date): boolean {
    if (!this.props.autoRenew || !this.props.currentPeriodEnd) return false;
    if (this.props.status === SubscriptionStatus.ACTIVE) {
      return (
        this.props.currentPeriodEnd <= now &&
        this.props.renewalForPeriodEnd?.getTime() !== this.props.currentPeriodEnd.getTime()
      );
    }
    if (this.props.status === SubscriptionStatus.GRACE_PERIOD) {
      const last = this.props.lastRenewalAt;
      return (
        this.props.lastRenewalStatus === "FAILED" &&
        last != null &&
        now.getTime() - last.getTime() >= RENEWAL_RETRY_INTERVAL_HOURS * 3_600_000 &&
        (this.props.graceEndsAt === null || now <= this.props.graceEndsAt)
      );
    }
    return false;
  }

  /** Marque la demande de renouvellement comme créée pour l'échéance courante. */
  markRenewalRequested(amount: number, now: Date): void {
    this.props.renewalForPeriodEnd = this.props.currentPeriodEnd;
    this.props.lastRenewalStatus = "PENDING";
    this.props.lastRenewalAt = now;
    this.props.lastRenewalAmount = amount;
    this.props.lastRenewalPaymentId = null;
    this.props.lastRenewalCheckoutUrl = null;
  }

  attachRenewalPayment(paymentId: string, checkoutUrl: string | null): void {
    this.props.lastRenewalPaymentId = paymentId;
    this.props.lastRenewalCheckoutUrl = checkoutUrl;
  }

  /** Le paiement `paymentId` est-il celui de la demande de renouvellement en attente ? */
  isAwaitingRenewalPayment(paymentId: string): boolean {
    return this.props.lastRenewalStatus === "PENDING" && this.props.lastRenewalPaymentId === paymentId;
  }

  /**
   * Renouvellement réussi : période prolongée, statut ACTIVE (y compris depuis la grâce ou l'expiration),
   * descente de gamme planifiée appliquée (prix facturé = nouveau prix).
   */
  completeRenewal(newPeriodEnd: Date, now: Date): void {
    if (this.props.status !== SubscriptionStatus.ACTIVE) {
      this.transitionTo(SubscriptionStatus.ACTIVE);
    }
    this.props.planPriceId = this.nextPlanPriceId();
    this.props.pendingPlanPriceId = null;
    this.props.pendingChangeAt = null;
    this.props.currentPeriodEnd = newPeriodEnd;
    this.props.graceEndsAt = null;
    this.props.lastRenewalStatus = "SUCCEEDED";
    this.props.lastRenewalAt = now;
    this.props.lastRenewalCheckoutUrl = null;
    this.props.isComplimentary = false;
    this.consumeDiscountPeriod();
  }

  /** Une période remisée vient d'être facturée : on en décompte une ; à zéro la remise disparaît. */
  private consumeDiscountPeriod(): void {
    const remaining = this.props.discountPeriodsRemaining ?? 0;
    if (remaining <= 0) return;
    if (remaining === 1) this.clearDiscount();
    else this.props.discountPeriodsRemaining = remaining - 1;
  }

  /** Échec du renouvellement : RG-02, passage en grâce (sans effet si déjà en grâce). Retourne la fin de grâce si nouvelle. */
  failRenewal(now: Date, graceDays?: number): { graceEndsAt: Date } | null {
    this.props.lastRenewalStatus = "FAILED";
    this.props.lastRenewalAt = now;
    this.props.lastRenewalCheckoutUrl = null;
    if (this.props.status !== SubscriptionStatus.ACTIVE) return null;
    return this.enterGracePeriod(graceDays, now);
  }

  /** Réservé à l'infrastructure (repository) pour persister l'état courant après mutation. */
  toSnapshot(): Readonly<SubscriptionProps> {
    return { ...this.props };
  }
}
