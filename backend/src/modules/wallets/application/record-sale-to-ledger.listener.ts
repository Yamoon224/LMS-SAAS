import { PaymentSucceededEvent } from "@modules/payments/payments.events";
import { PlansFacade } from "@modules/plans/plans.facade";
import { PlatformSettingsFacade } from "@modules/platform-settings/platform-settings.facade";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";


import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { buildSaleLedgerEntries } from "../domain/sale-ledger-entries";

import { computeAvailableAt } from "./retention-period";

/**
 * BE-06/RG-22: réagit à PaymentSucceeded pour écrire les écritures en partie
 * double de la vente au grand livre. Ne traite que les paiements de type
 * COURSE_ENROLLMENT (vente de formation, section 9.1) — les abonnements et
 * crédits IA sont des encaissements propres à la plateforme, pas des ventes
 * pour compte de tiers, et ne génèrent donc pas de solde entreprise.
 */
@Injectable()
export class RecordSaleToLedgerListener {
  private readonly logger = new Logger(RecordSaleToLedgerListener.name);

  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort,
    private readonly plansFacade: PlansFacade,
    private readonly settingsFacade: PlatformSettingsFacade,
  ) {}

  @OnEvent("payment.succeeded")
  async handle(event: PaymentSucceededEvent): Promise<void> {
    const { payment } = event;
    if (payment.type !== "COURSE_ENROLLMENT") {
      return;
    }

    const commission = await this.plansFacade.resolveCommission("ONLINE", payment.tenantId);
    const commissionAmount = this.computeCommissionAmount(payment.amount, commission);

    // ADM-21/ADM-23 : paramètres lus À L'USAGE ; la date de disponibilité et le net sont figés pour cette vente,
    // un changement ultérieur des paramètres ne la touche donc jamais.
    const settings = await this.settingsFacade.getFinanceSettings();
    const entries = buildSaleLedgerEntries({
      grossAmount: payment.amount,
      commissionAmount,
      providerFee: payment.providerFee,
      feeChargedToTenant: settings.transactionFeeBearer === "TENANT",
    });

    const availableAt = computeAvailableAt(new Date(), settings.retentionDays);

    await this.ledgerRepository.record({
      tenantId: payment.tenantId,
      currency: payment.currency,
      sourceId: payment.id,
      availableAt,
      entries,
    });

    this.logger.log(`Vente enregistrée au grand livre: paiement ${payment.id}, commission ${commissionAmount}.`);
  }

  private computeCommissionAmount(
    grossAmount: number,
    commission: { percentRate: number | null; fixedAmount: number | null },
  ): number {
    const percentPart = commission.percentRate ? Math.round((grossAmount * commission.percentRate) / 100) : 0;
    const fixedPart = commission.fixedAmount ?? 0;
    return percentPart + fixedPart;
  }
}
