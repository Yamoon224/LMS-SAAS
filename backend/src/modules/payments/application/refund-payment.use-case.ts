import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { PAYMENT_GATEWAY_REGISTRY } from "../domain/payment-gateway-registry.port";
import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import { isRefundCapable } from "../domain/payment-gateway.port";
import { PAYMENT_PROVIDER_CONFIG_REPOSITORY } from "../domain/payment-provider-config.repository.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import { RefundProcessedEvent } from "../payments.events";

export class RefundExceedsPaymentError extends DomainError {
  readonly code = "MONTANT_REMBOURSEMENT_INVALIDE";
}

export class RefundNotSupportedError extends DomainError {
  readonly code = "REMBOURSEMENT_NON_SUPPORTE";
}

export class ProviderConfigNotFoundError extends DomainError {
  readonly code = "FOURNISSEUR_INTROUVABLE";
}

/**
 * ADM-26: traitement des remboursements. Si le fournisseur propose une API
 * de remboursement (RefundCapable), elle est utilisée ; sinon le
 * remboursement doit être exécuté manuellement (section 9.5, "modalités").
 */
@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY_REGISTRY) private readonly gatewayRegistry: PaymentGatewayRegistryPort,
    @Inject(PAYMENT_PROVIDER_CONFIG_REPOSITORY)
    private readonly providerConfigRepository: PaymentProviderConfigRepositoryPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(paymentId: string, amount: number, reason?: string): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundDomainError(`Paiement introuvable: ${paymentId}`);
    }

    if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
      throw new RefundExceedsPaymentError(
        `Le montant à rembourser (${amount}) doit être un entier positif ne dépassant pas le paiement (${payment.amount}).`,
      );
    }

    const providerConfig = await this.providerConfigRepository.findById(payment.providerId);
    if (!providerConfig) {
      throw new ProviderConfigNotFoundError(`Fournisseur introuvable pour l'id: ${payment.providerId}`);
    }

    const gateway = await this.gatewayRegistry.findByCode(providerConfig.code);
    if (!gateway || !isRefundCapable(gateway)) {
      throw new RefundNotSupportedError(
        "Ce fournisseur ne propose pas de remboursement automatisé ; traitement manuel requis.",
      );
    }

    await gateway.refund({ providerReference: payment.providerReference, amount, reason });

    if (amount < payment.amount) {
      payment.markPartiallyRefunded();
    } else {
      payment.markRefunded();
    }
    await this.paymentRepository.save(payment);

    this.eventEmitter.emit("payment.refund-processed", new RefundProcessedEvent(payment, amount));
  }
}
