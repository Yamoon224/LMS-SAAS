import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { Inject, Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { isStatementAvailable, resolveStatementWindow, toPayoutStatementData } from "../domain/payout-statement";
import { PAYOUT_STATEMENT_RENDERER } from "../domain/payout-statement-renderer.port";
import type { PayoutStatementRendererPort } from "../domain/payout-statement-renderer.port";
import { PAYOUT_REPOSITORY } from "../domain/payout.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { summarizeSalesBreakdown } from "../domain/sales-breakdown";

export class PayoutStatementUnavailableError extends DomainError {
  readonly code = "RELEVE_INDISPONIBLE";
}

export interface PayoutStatementPdf {
  filename: string;
  content: Buffer;
}

/** ENT-69 : relevé PDF d'un reversement exécuté de l'entreprise appelante. */
@Injectable()
export class GeneratePayoutStatementUseCase {
  constructor(
    @Inject(PAYOUT_REPOSITORY) private readonly payoutRepository: PayoutRepositoryPort,
    @Inject(PAYOUT_STATEMENT_RENDERER) private readonly renderer: PayoutStatementRendererPort,
    private readonly tenantsFacade: TenantsFacade,
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort,
  ) {}

  async execute(tenantId: string, payoutId: string): Promise<PayoutStatementPdf> {
    const payout = await this.payoutRepository.findById(payoutId);
    // Même réponse pour « inexistant » et « autre entreprise » : on ne révèle pas l'existence.
    if (!payout || payout.tenantId !== tenantId) {
      throw new NotFoundDomainError(`Reversement introuvable: ${payoutId}`);
    }
    if (!isStatementAvailable(payout)) {
      throw new PayoutStatementUnavailableError("Le relevé n'est disponible qu'une fois le reversement exécuté.");
    }

    const tenant = await this.tenantsFacade.findById(tenantId);
    const window = resolveStatementWindow(payout, await this.payoutRepository.listByTenant(tenantId));
    const breakdown = window
      ? summarizeSalesBreakdown(await this.ledgerRepository.listBreakdownRows(tenantId, window.from, window.to))
      : null;
    const data = toPayoutStatementData(payout, tenant?.name ?? "Entreprise", breakdown);
    return { filename: `${data.number}.pdf`, content: await this.renderer.render(data) };
  }
}
