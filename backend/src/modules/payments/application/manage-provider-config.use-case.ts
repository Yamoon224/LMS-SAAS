import { Inject, Injectable } from "@nestjs/common";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { PAYMENT_PROVIDER_CONFIG_REPOSITORY } from "../domain/payment-provider-config.repository.port";
import type {
  PaymentProviderConfigRecord,
  PaymentProviderConfigRepositoryPort,
  SetProviderConfigData,
} from "../domain/payment-provider-config.repository.port";

/** ADM-20: activer/désactiver chaque fournisseur, clés test/production, priorité par moyen. */
@Injectable()
export class ManageProviderConfigUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER_CONFIG_REPOSITORY)
    private readonly providerConfigRepository: PaymentProviderConfigRepositoryPort,
  ) {}

  async upsert(data: SetProviderConfigData): Promise<PaymentProviderConfigRecord> {
    return this.providerConfigRepository.upsert(data);
  }

  async listAll(): Promise<PaymentProviderConfigRecord[]> {
    return this.providerConfigRepository.listAll();
  }

  /**
   * Suppression d'un fournisseur (ADM-20). Refusée s'il a déjà traité des paiements : on les rattache à lui pour le grand livre,
   * les remboursements et le rapprochement ; il faut alors le désactiver plutôt que le supprimer.
   */
  async remove(code: string): Promise<void> {
    const result = await this.providerConfigRepository.deleteByCode(code);
    if (!result) throw new NotFoundDomainError("Fournisseur de paiement introuvable.");
    if (!result.deleted) {
      throw new InvalidStateTransitionError(
        `Ce fournisseur a déjà traité ${result.paymentCount} paiement(s) : sa suppression effacerait l'historique financier. Désactivez-le à la place.`,
      );
    }
  }

  async setActive(code: string, isActive: boolean): Promise<void> {
    await this.providerConfigRepository.setActive(code, isActive);
  }
}
