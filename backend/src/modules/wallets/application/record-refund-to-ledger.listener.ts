import { RefundProcessedEvent } from "@modules/payments/payments.events";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { buildRefundLedgerEntries, prorateTenantNet } from "../domain/refund-ledger-entries";

/**
 * RG-25: réagit à RefundProcessed pour annuler la commission de la vente et
 * débiter le solde de l'entreprise, au prorata si le remboursement est
 * partiel. Si le net a déjà été reversé, le solde devient négatif — c'est le
 * comportement attendu, compensé sur les reversements suivants (RG-25).
 */
@Injectable()
export class RecordRefundToLedgerListener {
  private readonly logger = new Logger(RecordRefundToLedgerListener.name);

  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort) {}

  @OnEvent("payment.refund-processed")
  async handle(event: RefundProcessedEvent): Promise<void> {
    const { payment } = event;
    if (payment.type !== "COURSE_ENROLLMENT") {
      return;
    }

    const originalTenantNet = await this.ledgerRepository.getTenantNetForSale(payment.id);
    if (originalTenantNet === null) {
      this.logger.warn(`Aucune écriture de vente trouvée pour le paiement remboursé ${payment.id}.`);
      return;
    }

    // Remboursement partiel : le net repris est proportionnel au montant effectivement remboursé.
    const entries = buildRefundLedgerEntries({
      refundAmount: event.refundedAmount,
      tenantNetToReverse: prorateTenantNet(originalTenantNet, event.refundedAmount, payment.amount),
    });

    await this.ledgerRepository.record({
      tenantId: payment.tenantId,
      currency: payment.currency,
      sourceId: `refund-${payment.id}`,
      availableAt: new Date(), // un débit est toujours immédiatement "disponible" (c'est une sortie).
      entries,
    });

    this.logger.log(`Remboursement enregistré au grand livre pour le paiement ${payment.id}.`);
  }
}
