import { Inject, Injectable } from "@nestjs/common";

import type { PaymentMethod } from "../domain/payment-method";
import { PAYMENT_PROVIDER_CONFIG_REPOSITORY } from "../domain/payment-provider-config.repository.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";

/** Moyens de paiement actuellement proposables: union des moyens des fournisseurs ACTIFS (aucune clé exposée). */
@Injectable()
export class ListAvailableMethodsUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER_CONFIG_REPOSITORY)
    private readonly providerConfigRepository: PaymentProviderConfigRepositoryPort,
  ) {}

  async execute(): Promise<PaymentMethod[]> {
    const configs = await this.providerConfigRepository.listAll();
    const methods = new Set<PaymentMethod>();
    for (const config of configs) {
      if (config.isActive) config.supportedMethods.forEach((method) => methods.add(method));
    }
    return [...methods];
  }
}
