import { Inject, Injectable } from "@nestjs/common";

import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { summarizeSalesBreakdown } from "../domain/sales-breakdown";
import type { SalesBreakdown } from "../domain/sales-breakdown";

/** Fin de période « sans limite » : inclut aussi les ventes dont la rétention n'est pas encore écoulée. */
const FAR_FUTURE = new Date("9999-12-31T23:59:59Z");

/** Étape 30 / ENT-69 : ventilation cumulée brut / commission / frais / net pour l'écran de solde de l'entreprise. */
@Injectable()
export class GetSalesBreakdownUseCase {
  constructor(@Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort) {}

  async execute(tenantId: string): Promise<SalesBreakdown> {
    return summarizeSalesBreakdown(await this.ledgerRepository.listBreakdownRows(tenantId, null, FAR_FUTURE));
  }
}
