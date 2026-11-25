import { PlansFacade } from "@modules/plans/plans.facade";
import { Inject, Injectable } from "@nestjs/common";


import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { buildOfflineCommissionLedgerEntries } from "../domain/refund-ledger-entries";

export interface RecordOfflineSaleInput {
  tenantId: string;
  /** Identifiant de l'inscription hors plateforme validée (ADM-25). */
  enrollmentId: string;
  /** Montant déclaré par le gestionnaire lors de la validation (RG-07). */
  declaredAmount: number;
}

/**
 * ADM-25/RG-24: "une vente hors plateforme génère, si la règle l'exige, une
 * commission due par l'entreprise, déduite du prochain reversement ou
 * facturée." N'écrit au grand livre que si une commission est effectivement
 * due (règle OFFLINE résolue à un montant non nul) — par défaut, aucune
 * commission hors plateforme n'est due (ADM-16: "aucune (par défaut)").
 */
@Injectable()
export class RecordOfflineSaleCommissionUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort,
    private readonly plansFacade: PlansFacade,
  ) {}

  async execute(input: RecordOfflineSaleInput): Promise<number> {
    const commission = await this.plansFacade.resolveCommission("OFFLINE", input.tenantId);

    const percentPart = commission.percentRate
      ? Math.round((input.declaredAmount * commission.percentRate) / 100)
      : 0;
    const commissionAmount = percentPart + (commission.fixedAmount ?? 0);

    if (commissionAmount <= 0) {
      return 0;
    }

    const entries = buildOfflineCommissionLedgerEntries({ commissionAmount });

    await this.ledgerRepository.record({
      tenantId: input.tenantId,
      currency: "XOF",
      sourceId: input.enrollmentId,
      availableAt: new Date(),
      entries,
    });

    return commissionAmount;
  }
}
