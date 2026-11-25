import { Injectable } from "@nestjs/common";

import { ActivateSubscriptionUseCase } from "./application/activate-subscription.use-case";
import { CheckTenantOperationalUseCase } from "./application/check-tenant-operational.use-case";
import {
  AttachRenewalPaymentUseCase,
  BeginRenewalUseCase,
  ConfirmSubscriptionPaymentUseCase,
  FailRenewalUseCase,
  ListRenewalCandidatesUseCase,
} from "./application/renewal.use-cases";
import type { RenewalQuote } from "./application/renewal.use-cases";

export type { RenewalQuote } from "./application/renewal.use-cases";

/**
 * Seule API publique du module subscriptions. Le module payments l'invoque en réaction aux paiements :
 * confirmation (activation initiale ou renouvellement), échec (période de grâce), et pour piloter le job de
 * renouvellement automatique (liste des échéances, réservation idempotente, rattachement du lien de paiement).
 */
@Injectable()
export class SubscriptionsFacade {
  constructor(
    private readonly checkTenantOperationalUseCase: CheckTenantOperationalUseCase,
    private readonly activateSubscriptionUseCase: ActivateSubscriptionUseCase,
    private readonly confirmSubscriptionPaymentUseCase: ConfirmSubscriptionPaymentUseCase,
    private readonly failRenewalUseCase: FailRenewalUseCase,
    private readonly listRenewalCandidatesUseCase: ListRenewalCandidatesUseCase,
    private readonly beginRenewalUseCase: BeginRenewalUseCase,
    private readonly attachRenewalPaymentUseCase: AttachRenewalPaymentUseCase,
  ) {}

  async isTenantOperational(tenantId: string): Promise<boolean> {
    return this.checkTenantOperationalUseCase.execute(tenantId);
  }

  async activateSubscription(subscriptionId: string, periodEnd: Date): Promise<void> {
    await this.activateSubscriptionUseCase.execute(subscriptionId, periodEnd);
  }

  /** Paiement d'abonnement confirmé : activation initiale ou renouvellement (selon la demande en attente). */
  async confirmSubscriptionPayment(subscriptionId: string, paymentId: string): Promise<void> {
    await this.confirmSubscriptionPaymentUseCase.execute(subscriptionId, paymentId);
  }

  /** Paiement échoué : période de grâce si c'est le paiement de la demande de renouvellement en attente. */
  async handleRenewalFailure(subscriptionId: string, paymentId?: string): Promise<void> {
    await this.failRenewalUseCase.execute(subscriptionId, paymentId);
  }

  async listRenewalCandidateIds(now: Date = new Date()): Promise<string[]> {
    return this.listRenewalCandidatesUseCase.execute(now);
  }

  /** Réserve le renouvellement de l'échéance ; null si déjà demandé, pas dû, ou renouvelé sans paiement (prix nul). */
  async beginRenewal(subscriptionId: string, now: Date = new Date()): Promise<RenewalQuote | null> {
    return this.beginRenewalUseCase.execute(subscriptionId, now);
  }

  async attachRenewalPayment(
    subscriptionId: string,
    paymentId: string,
    checkoutUrl: string | null,
    currency: string,
  ): Promise<void> {
    await this.attachRenewalPaymentUseCase.execute(subscriptionId, paymentId, checkoutUrl, currency);
  }
}
