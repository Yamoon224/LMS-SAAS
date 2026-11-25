import { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";
import { Injectable, Logger } from "@nestjs/common";

import { pickRenewalMethod } from "../domain/renewal-method";

import { InitiatePaymentUseCase } from "./initiate-payment.use-case";
import { ListAvailableMethodsUseCase } from "./list-available-methods.use-case";

export interface RenewalRunReport {
  candidates: number;
  requested: number;
  skipped: number;
  failed: number;
}

/**
 * ENT-03 : renouvellement automatique. Pour chaque abonnement échu avec `autoRenew`, réserve l'échéance de façon
 * idempotente (SubscriptionsFacade.beginRenewal), crée la demande de paiement via le port de paiement existant
 * (lien de paiement ; aucun moyen mémorisé n'existe) et la rattache à l'abonnement, qui notifie l'entreprise.
 * Succès/échec sont ensuite traités par les listeners `payment.succeeded` / `payment.failed` (prolongation
 * ou période de grâce RG-02). Si le paiement ne peut pas être créé, l'échéance est traitée comme un échec.
 */
@Injectable()
export class RenewDueSubscriptionsUseCase {
  private readonly logger = new Logger(RenewDueSubscriptionsUseCase.name);

  constructor(
    private readonly subscriptionsFacade: SubscriptionsFacade,
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly listAvailableMethodsUseCase: ListAvailableMethodsUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<RenewalRunReport> {
    const ids = await this.subscriptionsFacade.listRenewalCandidateIds(now);
    const report: RenewalRunReport = { candidates: ids.length, requested: 0, skipped: 0, failed: 0 };
    if (ids.length === 0) return report;

    const method = pickRenewalMethod(await this.listAvailableMethodsUseCase.execute());

    for (const id of ids) {
      try {
        const quote = await this.subscriptionsFacade.beginRenewal(id, now);
        if (!quote) {
          report.skipped += 1;
          continue;
        }
        try {
          if (!method) throw new Error("Aucun moyen de paiement disponible.");
          const { paymentId, checkout } = await this.initiatePaymentUseCase.execute({
            tenantId: quote.tenantId,
            type: "SUBSCRIPTION",
            method,
            amount: quote.amount,
            currency: quote.currency,
            objectId: quote.subscriptionId,
            subscriptionId: quote.subscriptionId,
          });
          await this.subscriptionsFacade.attachRenewalPayment(
            quote.subscriptionId,
            paymentId,
            checkout.checkoutUrl ?? null,
            quote.currency,
          );
          report.requested += 1;
        } catch (error) {
          report.failed += 1;
          this.logger.error(`Création du paiement de renouvellement impossible (${id}) : ${String(error)}`);
          await this.subscriptionsFacade.handleRenewalFailure(quote.subscriptionId);
        }
      } catch (error) {
        report.failed += 1;
        this.logger.error(`Renouvellement en erreur (${id}) : ${String(error)}`);
      }
    }
    return report;
  }
}
