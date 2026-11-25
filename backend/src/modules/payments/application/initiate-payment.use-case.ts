import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";
import { nanoid } from "nanoid";


import type { Checkout } from "../domain/gateway.types";
import { PAYMENT_GATEWAY_REGISTRY } from "../domain/payment-gateway-registry.port";
import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentMethod, PaymentType } from "../domain/payment-method";
import { PAYMENT_PROVIDER_CONFIG_REPOSITORY } from "../domain/payment-provider-config.repository.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

export interface InitiatePaymentInput {
  tenantId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  currency: string;
  objectId: string;
  subscriptionId?: string;
  enrollmentId?: string;
  creditPackId?: string;
  customerEmail?: string;
  callbackUrl?: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  checkout: Checkout;
}

/**
 * BE-04/section 9.6: initialise une transaction côté serveur uniquement,
 * avec une référence unique générée par la plateforme (jamais par le
 * fournisseur) et des métadonnées (tenant, type, objet). Le fournisseur est
 * résolu via le registre (routage par moyen de paiement, bascule si le
 * prioritaire est indisponible).
 */
@Injectable()
export class InitiatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY_REGISTRY) private readonly gatewayRegistry: PaymentGatewayRegistryPort,
    @Inject(PAYMENT_PROVIDER_CONFIG_REPOSITORY)
    private readonly providerConfigRepository: PaymentProviderConfigRepositoryPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  async execute(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const gateway = await this.gatewayRegistry.resolveForMethod(input.method);

    const providerConfig = await this.providerConfigRepository.findByCode(gateway.code);
    if (!providerConfig) {
      throw new NotFoundDomainError(
        `Configuration introuvable pour le fournisseur résolu: ${gateway.code}`,
      );
    }

    const reference = this.generateReference(input.type);

    const checkout = await gateway.initiate({
      reference,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      metadata: { tenantId: input.tenantId, type: input.type, objectId: input.objectId },
      customerEmail: input.customerEmail,
      callbackUrl: input.callbackUrl,
    });

    const payment = await this.paymentRepository.create({
      tenantId: input.tenantId,
      providerId: providerConfig.id,
      type: input.type,
      method: input.method,
      amount: input.amount,
      currency: input.currency,
      providerReference: checkout.providerReference,
      subscriptionId: input.subscriptionId,
      enrollmentId: input.enrollmentId,
      creditPackId: input.creditPackId,
    });

    return { paymentId: payment.id, checkout };
  }

  private generateReference(type: PaymentType): string {
    return `${type.toLowerCase()}_${nanoid(16)}`;
  }
}
