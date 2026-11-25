import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentProviderConfigRepositoryPort } from "../domain/payment-provider-config.repository.port";
import { Payment } from "../domain/payment.entity";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import type { RefundRequest } from "../domain/refund-request";
import type { RefundRequestRepositoryPort } from "../domain/refund-request.repository.port";

import { ProviderConfigNotFoundError, RefundNotSupportedError, RefundPaymentUseCase } from "./refund-payment.use-case";
import { ListRefundRequestsUseCase } from "./refund-requests.use-cases";

const payment = () =>
  Payment.fromPersistence({
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
    status: "SUCCEEDED",
    subscriptionId: null,
    enrollmentId: "enrollment-1",
    creditPackId: null,
  });

function setup(opts: { payment?: Payment | null; config?: { code: string } | null; gateway?: object | null }) {
  const found = opts.payment === undefined ? payment() : opts.payment;
  const config = opts.config === undefined ? { code: "PAYSTACK" } : opts.config;
  const gateway = opts.gateway === undefined ? {} : opts.gateway;
  const payments = { findById: jest.fn().mockResolvedValue(found), save: jest.fn() };
  const events = { emit: jest.fn() };
  const useCase = new RefundPaymentUseCase(
    { findByCode: jest.fn().mockResolvedValue(gateway) } as unknown as PaymentGatewayRegistryPort,
    { findById: jest.fn().mockResolvedValue(config) } as unknown as PaymentProviderConfigRepositoryPort,
    payments as unknown as PaymentRepositoryPort,
    events as unknown as EventEmitter2,
  );
  return { payments, events, useCase };
}

describe("RefundPaymentUseCase (gardes)", () => {
  it("lève NotFoundDomainError pour un paiement inconnu", async () => {
    const { useCase, payments } = setup({ payment: null });
    await expect(useCase.execute("nope", 1000)).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(payments.save).not.toHaveBeenCalled();
  });

  it("lève ProviderConfigNotFoundError quand la configuration du fournisseur est absente", async () => {
    const { useCase, payments } = setup({ config: null });
    await expect(useCase.execute("payment-1", 1000)).rejects.toBeInstanceOf(ProviderConfigNotFoundError);
    expect(payments.save).not.toHaveBeenCalled();
  });

  it("exige un traitement manuel quand la passerelle est introuvable", async () => {
    const { useCase, events } = setup({ gateway: null });
    await expect(useCase.execute("payment-1", 1000)).rejects.toBeInstanceOf(RefundNotSupportedError);
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("exige un traitement manuel quand la passerelle ne sait pas rembourser", async () => {
    const { useCase, payments, events } = setup({ gateway: { initiate: jest.fn() } });
    await expect(useCase.execute("payment-1", 1000)).rejects.toBeInstanceOf(RefundNotSupportedError);
    expect(payments.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("ListRefundRequestsUseCase", () => {
  it("délègue chaque lecture au dépôt avec le bon filtre", async () => {
    const rows = [{ id: "r1" }] as RefundRequest[];
    const repo = {
      listForTenant: jest.fn().mockResolvedValue(rows),
      listByStatus: jest.fn().mockResolvedValue(rows),
      listForLearner: jest.fn().mockResolvedValue(rows),
    };
    const useCase = new ListRefundRequestsUseCase(repo as unknown as RefundRequestRepositoryPort);
    await expect(useCase.forTenant("t1")).resolves.toBe(rows);
    await expect(useCase.byStatus("REQUESTED")).resolves.toBe(rows);
    await expect(useCase.forLearner("u1")).resolves.toBe(rows);
    expect(repo.listForTenant).toHaveBeenCalledWith("t1");
    expect(repo.listByStatus).toHaveBeenCalledWith("REQUESTED");
    expect(repo.listForLearner).toHaveBeenCalledWith("u1");
  });
});
