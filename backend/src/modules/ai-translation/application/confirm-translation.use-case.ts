import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { TranslationConfirmedEvent } from "../ai-translation.events";
import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CREDIT_WALLET_REPOSITORY } from "../domain/credit-wallet.repository.port";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";
import { TRANSLATION_JOB_REPOSITORY } from "../domain/translation-job.repository.port";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";

/**
 * ADM-18: "la confirmation du gestionnaire déclenche le débit immédiat des
 * crédits estimés." Le débit a lieu ici, à la confirmation — pas à la fin de
 * la traduction — pour que le solde affiché reflète toujours l'engagement
 * déjà pris. En cas d'échec de la traduction elle-même, les crédits sont
 * recrédités (voir RunTranslationUseCase.fail()).
 */
@Injectable()
export class ConfirmTranslationUseCase {
  constructor(
    @Inject(TRANSLATION_JOB_REPOSITORY) private readonly jobRepository: TranslationJobRepositoryPort,
    @Inject(CREDIT_WALLET_REPOSITORY) private readonly walletRepository: CreditWalletRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(jobId: string, tenantId: string): Promise<void> {
    const job = await this.jobRepository.findById(jobId);
    if (!job || job.toSnapshot().tenantId !== tenantId) {
      throw new NotFoundDomainError(`Job de traduction introuvable: ${jobId}`);
    }

    const snapshot = job.toSnapshot();
    const estimatedCredits = snapshot.estimatedCredits ?? 0;

    const wallet =
      (await this.walletRepository.findByTenantId(snapshot.tenantId)) ??
      (await this.walletRepository.createForTenant(snapshot.tenantId));

    wallet.debit(estimatedCredits);
    await this.walletRepository.save(wallet);
    await this.walletRepository.recordLedgerEntry({
      walletId: wallet.id,
      type: CreditLedgerType.DEBIT,
      amount: -estimatedCredits,
      translationJobId: job.id,
      note: `Traduction vers ${snapshot.targetLocale}`,
    });

    job.confirm(estimatedCredits);
    await this.jobRepository.save(job);

    this.eventEmitter.emit("translation.confirmed", new TranslationConfirmedEvent(job.id));
  }
}
