import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError } from "@shared/errors";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";
import { Payment } from "../domain/payment.entity";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import type { RefundProcessedEvent } from "../payments.events";

import { RefundExceedsPaymentError, RefundPaymentUseCase } from "./refund-payment.use-case";

function buildPayment(status: "SUCCEEDED" | "REFUNDED" = "SUCCEEDED") {
  return Payment.fromPersistence({
    id: "payment-1",
    tenantId: "tenant-1",
    providerId: "provider-1",
    type: "COURSE_ENROLLMENT",
    method: "MTN_MOMO",
    amount: 50000,
    currency: "XOF",
    providerFee: 0,
    commissionAmount: 0,
    providerReference: "ref-1",
    status,
    subscriptionId: null,
    enrollmentId: "enrollment-1",
    creditPackId: null,
  });
}

function setup(payment: Payment | null = buildPayment()) {
  const gateway = { refund: jest.fn().mockResolvedValue({ providerRefundReference: "r1", status: "SUCCEEDED" }) };
  const registry = { findByCode: jest.fn().mockResolvedValue(gateway) } as unknown as PaymentGatewayRegistryPort;
  const configs = { findById: jest.fn().mockResolvedValue({ code: "PAYSTACK" }) } as unknown as PaymentProviderConfigRepositoryPort;
  const payments = {
    findById: jest.fn().mockResolvedValue(payment),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<PaymentRepositoryPort>;
  const events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
  return { gateway, payments, events, useCase: new RefundPaymentUseCase(registry, configs, payments, events) };
}

describe("RefundPaymentUseCase (remboursement partiel)", () => {
  it("un remboursement intégral passe le paiement à REFUNDED", async () => {
    const { useCase, payments, gateway, events } = setup();
    await useCase.execute("payment-1", 50000);
    expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
    expect(payments.save.mock.calls[0]?.[0]).toMatchObject({ status: "REFUNDED" });
    expect((events.emit.mock.calls[0]?.[1] as RefundProcessedEvent).refundedAmount).toBe(50000);
  });

  it("un remboursement partiel passe le paiement à PARTIALLY_REFUNDED et annonce le montant réel", async () => {
    const { useCase, payments, gateway, events } = setup();
    await useCase.execute("payment-1", 20000);
    expect(gateway.refund).toHaveBeenCalledWith(expect.objectContaining({ amount: 20000 }));
    expect(payments.save.mock.calls[0]?.[0]).toMatchObject({ status: "PARTIALLY_REFUNDED" });
    expect((events.emit.mock.calls[0]?.[1] as RefundProcessedEvent).refundedAmount).toBe(20000);
  });

  it.each([0, -1, 50001, 10.5])("refuse un montant invalide (%s) AVANT d'appeler le fournisseur", async (amount) => {
    const { useCase, gateway, payments, events } = setup();
    await expect(useCase.execute("payment-1", amount)).rejects.toThrow(RefundExceedsPaymentError);
    expect(gateway.refund).not.toHaveBeenCalled();
    expect(payments.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("refuse un paiement déjà remboursé", async () => {
    const { useCase } = setup(buildPayment("REFUNDED"));
    await expect(useCase.execute("payment-1", 1000)).rejects.toThrow(InvalidStateTransitionError);
  });
});
