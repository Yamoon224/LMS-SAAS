import { NotFoundDomainError } from "@shared/errors";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

import { InitiatePaymentUseCase } from "./initiate-payment.use-case";

function setup(config: { id: string } | null = { id: "prov-1" }) {
  const checkout = { checkoutUrl: "https://pay/x", providerReference: "prov-ref-1", isAsync: false };
  const gateway = { code: "PAYSTACK", initiate: jest.fn().mockResolvedValue(checkout) };
  const registry = { resolveForMethod: jest.fn().mockResolvedValue(gateway) };
  const configs = { findByCode: jest.fn().mockResolvedValue(config) };
  const payments = { create: jest.fn().mockResolvedValue({ id: "pay-9" }) };
  const useCase = new InitiatePaymentUseCase(
    registry as unknown as PaymentGatewayRegistryPort,
    configs as unknown as PaymentProviderConfigRepositoryPort,
    payments as unknown as PaymentRepositoryPort,
  );
  return { gateway, registry, configs, payments, checkout, useCase };
}

describe("InitiatePaymentUseCase", () => {
  it("initie chez la passerelle résolue puis enregistre le paiement", async () => {
    const { gateway, registry, configs, payments, checkout, useCase } = setup();

    const result = await useCase.execute({
      tenantId: "tenant-1",
      type: "SUBSCRIPTION",
      method: "CARD",
      amount: 15000,
      currency: "XOF",
      objectId: "sub-1",
      subscriptionId: "sub-1",
      customerEmail: "a@b.c",
      callbackUrl: "https://cb",
    });

    expect(result).toEqual({ paymentId: "pay-9", checkout });
    expect(registry.resolveForMethod).toHaveBeenCalledWith("CARD");
    expect(configs.findByCode).toHaveBeenCalledWith("PAYSTACK");
    const order = gateway.initiate.mock.calls[0]?.[0];
    expect(order).toMatchObject({
      amount: 15000,
      currency: "XOF",
      method: "CARD",
      metadata: { tenantId: "tenant-1", type: "SUBSCRIPTION", objectId: "sub-1" },
      customerEmail: "a@b.c",
      callbackUrl: "https://cb",
    });
    expect(order.reference).toMatch(/^subscription_[\w-]{16}$/);
    expect(payments.create).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      providerId: "prov-1",
      type: "SUBSCRIPTION",
      method: "CARD",
      amount: 15000,
      currency: "XOF",
      providerReference: "prov-ref-1",
      subscriptionId: "sub-1",
      enrollmentId: undefined,
      creditPackId: undefined,
    });
  });

  it("génère une référence unique par appel", async () => {
    const { gateway, useCase } = setup();
    const input = { tenantId: "t", type: "CREDIT_PURCHASE" as const, method: "CARD" as const, amount: 1, currency: "XOF", objectId: "o" };
    await useCase.execute(input);
    await useCase.execute(input);
    expect(gateway.initiate.mock.calls[0]?.[0].reference).not.toBe(gateway.initiate.mock.calls[1]?.[0].reference);
  });

  it("lève NotFoundDomainError sans configuration du fournisseur et n'appelle ni passerelle ni dépôt", async () => {
    const { gateway, payments, useCase } = setup(null);
    await expect(
      useCase.execute({ tenantId: "t", type: "SUBSCRIPTION", method: "CARD", amount: 1, currency: "XOF", objectId: "o" }),
    ).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(gateway.initiate).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
  });
});
