import { PlatformSettingsFacade } from "@modules/platform-settings/platform-settings.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors/domain-error";

import { LEDGER_REPOSITORY } from "../domain/ledger.repository.port";
import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import type { Payout } from "../domain/payout.entity";
import { PAYOUT_REPOSITORY } from "../domain/payout.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { canRequestPayout } from "../domain/tenant-balance";
import { PayoutRequestedEvent } from "../wallets.events";

export class PayoutBelowThresholdError extends DomainError {
  readonly code = "REVERSEMENT_SOUS_LE_SEUIL";
}

export class PayoutAlreadyOpenError extends DomainError {
  readonly code = "REVERSEMENT_DEJA_OUVERT";
}

/**
 * ENT-69/ADM-23/RG-23: "un reversement ne porte que sur le solde disponible,
 * au-dessus du seuil minimum, vers des coordonnées vérifiées." La vérification (ENT-11) est exigée ICI :
 * sans compte vérifié par un administrateur la demande est refusée (`COMPTE_REVERSEMENT_NON_VERIFIE`), et la
 * destination est TOUJOURS le compte enregistré (jamais une saisie libre du demandeur).
 */
@Injectable()
export class RequestPayoutUseCase {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepository: LedgerRepositoryPort,
    @Inject(PAYOUT_REPOSITORY) private readonly payoutRepository: PayoutRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
    private readonly tenantsFacade: TenantsFacade,
    private readonly settingsFacade: PlatformSettingsFacade,
  ) {}

  /**
   * `minimumThreshold` omis = seuil des paramètres financiers de la plateforme (ADM-23), lu à l'usage.
   * `automatic` = demande générée par la tâche planifiée (auteur « système ») : l'approbation et l'exécution restent
   * soumises à la double validation humaine (ADM-24).
   */
  async execute(tenantId: string, minimumThreshold?: number, automatic = false): Promise<Payout> {
    const destination = await this.tenantsFacade.getVerifiedPayoutDestination(tenantId);
    // Une seule demande ouverte par entreprise : le solde n'est débité qu'à l'exécution, une seconde demande
    // porterait sur les mêmes fonds (double reversement).
    if (await this.payoutRepository.hasOpenPayout(tenantId)) {
      throw new PayoutAlreadyOpenError("Une demande de reversement est déjà en cours pour cette entreprise.");
    }
    const threshold = minimumThreshold ?? (await this.settingsFacade.getFinanceSettings()).minimumPayoutThreshold;
    const balance = await this.ledgerRepository.getTenantBalance(tenantId);

    if (!canRequestPayout(balance, threshold)) {
      throw new PayoutBelowThresholdError(
        `Le solde disponible (${balance.availableAmount}) est inférieur au seuil minimum (${threshold}).`,
      );
    }

    const payout = await this.payoutRepository.create({
      tenantId,
      amount: balance.availableAmount,
      currency: balance.currency,
      destination,
    });

    this.eventEmitter.emit("payout.requested", new PayoutRequestedEvent(payout.id, tenantId, automatic));

    return payout;
  }
}
