import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { ParsedWebhookEvent, PaymentResult } from "../domain/gateway.types";
import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import { Payment } from "../domain/payment.entity";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";

import { InvalidWebhookSignatureError, ProcessWebhookUseCase } from "./process-webhook.use-case";

function buildPendingPayment(): Payment {
  return Payment.fromPersistence({
    id: "payment-1",
    tenantId: "tenant-1",
    providerId: "provider-1",
    type: "COURSE_ENROLLMENT",
    method: "ORANGE_MONEY",
    amount: 50000,
    currency: "XOF",
    providerFee: 0,
    commissionAmount: 0,
    providerReference: "ref-123",
    status: "PENDING",
    subscriptionId: null,
    enrollmentId: "enrollment-1",
    creditPackId: null,
  });
}

function buildGatewayMock(overrides: Partial<PaymentGateway> = {}): PaymentGateway {
  return {
    code: "PAYSTACK",
    supportedMethods: ["CARD"],
    initiate: jest.fn(),
    verify: jest.fn(),
    verifySignature: jest.fn().mockReturnValue(true),
    parseEvent: jest.fn(),
    ...overrides,
  };
}

function buildRegistryMock(gateway: PaymentGateway | null): PaymentGatewayRegistryPort {
  return {
    resolveForMethod: jest.fn(),
    findByCode: jest.fn().mockResolvedValue(gateway),
  };
}

const noopLog = {
  record: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn(),
  listUnresolvedFailures: jest.fn(),
  markResolved: jest.fn(),
};

function buildPaymentRepositoryMock(payment: Payment | null): PaymentRepositoryPort {
  return {
    findById: jest.fn(),
    findByProviderReference: jest.fn().mockResolvedValue(payment),
    create: jest.fn(),
    save: jest.fn(),
    listInvoices: jest.fn(),
    findInvoice: jest.fn(),
    storeRawWebhookPayload: jest.fn(),
  };
}

const RAW_EVENT = { headers: { "x-paystack-signature": "abc" }, rawBody: "{}" };

describe("ProcessWebhookUseCase - signature and routing", () => {
  it("rejects a webhook with an invalid signature before reading the payload", async () => {
    const gateway = buildGatewayMock({ verifySignature: jest.fn().mockReturnValue(false) });
    const paymentRepository = buildPaymentRepositoryMock(null);
    const useCase = new ProcessWebhookUseCase(
      buildRegistryMock(gateway),
      paymentRepository,
      { emit: jest.fn() } as unknown as EventEmitter2,
      noopLog,
    );

    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).rejects.toThrow(
      InvalidWebhookSignatureError,
    );
    expect(paymentRepository.findByProviderReference).not.toHaveBeenCalled();
  });

  it("raises NotFoundDomainError for an unknown provider code", async () => {
    const useCase = new ProcessWebhookUseCase(
      buildRegistryMock(null),
      buildPaymentRepositoryMock(null),
      { emit: jest.fn() } as unknown as EventEmitter2,
      noopLog,
    );

    await expect(useCase.execute("UNKNOWN", RAW_EVENT)).rejects.toThrow(NotFoundDomainError);
  });

  it("ignores a webhook for a reference it does not know (no payment created)", async () => {
    const parsed: ParsedWebhookEvent = {
      type: "PAYMENT_SUCCEEDED",
      providerReference: "ref-unknown",
      rawPayload: {},
    };
    const gateway = buildGatewayMock({ parseEvent: jest.fn().mockReturnValue(parsed) });
    const paymentRepository = buildPaymentRepositoryMock(null);
    const useCase = new ProcessWebhookUseCase(
      buildRegistryMock(gateway),
      paymentRepository,
      { emit: jest.fn() } as unknown as EventEmitter2,
      noopLog,
    );

    await useCase.execute("PAYSTACK", RAW_EVENT);

    expect(paymentRepository.storeRawWebhookPayload).not.toHaveBeenCalled();
  });
});

describe("ProcessWebhookUseCase - state transitions", () => {
  it("re-verifies with the provider before marking a payment succeeded (RG-06)", async () => {
    const payment = buildPendingPayment();
    const parsed: ParsedWebhookEvent = {
      type: "PAYMENT_SUCCEEDED",
      providerReference: "ref-123",
      rawPayload: { event: "charge.success" },
    };
    const verifiedResult: PaymentResult = {
      providerReference: "ref-123",
      status: "SUCCEEDED",
      amount: 50000,
      currency: "XOF",
      providerFee: 500,
    };
    const gateway = buildGatewayMock({
      parseEvent: jest.fn().mockReturnValue(parsed),
      verify: jest.fn().mockResolvedValue(verifiedResult),
    });
    const paymentRepository = buildPaymentRepositoryMock(payment);
    const emit = jest.fn();

    const useCase = new ProcessWebhookUseCase(buildRegistryMock(gateway), paymentRepository, {
      emit,
    } as unknown as EventEmitter2, noopLog);

    await useCase.execute("PAYSTACK", RAW_EVENT);

    expect(gateway.verify).toHaveBeenCalledWith("ref-123");
    expect(payment.status).toBe("SUCCEEDED");
    expect(paymentRepository.save).toHaveBeenCalledWith(payment);
    expect(emit).toHaveBeenCalledWith("payment.succeeded", expect.objectContaining({ payment }));
  });
});

describe("ProcessWebhookUseCase - idempotence and failure", () => {
  it("is idempotent: a webhook for an already-processed payment does not re-verify", async () => {
    const payment = buildPendingPayment();
    payment.markSucceeded(500); // already processed by a previous webhook delivery

    const parsed: ParsedWebhookEvent = {
      type: "PAYMENT_SUCCEEDED",
      providerReference: "ref-123",
      rawPayload: {},
    };
    const gateway = buildGatewayMock({ parseEvent: jest.fn().mockReturnValue(parsed) });
    const paymentRepository = buildPaymentRepositoryMock(payment);

    const useCase = new ProcessWebhookUseCase(buildRegistryMock(gateway), paymentRepository, {
      emit: jest.fn(),
    } as unknown as EventEmitter2, noopLog);

    await useCase.execute("PAYSTACK", RAW_EVENT);

    expect(gateway.verify).not.toHaveBeenCalled();
    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it("marks the payment failed when the provider confirms a failure", async () => {
    const payment = buildPendingPayment();
    const parsed: ParsedWebhookEvent = {
      type: "PAYMENT_FAILED",
      providerReference: "ref-123",
      rawPayload: {},
    };
    const verifiedResult: PaymentResult = {
      providerReference: "ref-123",
      status: "FAILED",
      amount: 50000,
      currency: "XOF",
      providerFee: 0,
    };
    const gateway = buildGatewayMock({
      parseEvent: jest.fn().mockReturnValue(parsed),
      verify: jest.fn().mockResolvedValue(verifiedResult),
    });
    const paymentRepository = buildPaymentRepositoryMock(payment);
    const emit = jest.fn();

    const useCase = new ProcessWebhookUseCase(buildRegistryMock(gateway), paymentRepository, {
      emit,
    } as unknown as EventEmitter2, noopLog);

    await useCase.execute("PAYSTACK", RAW_EVENT);

    expect(payment.status).toBe("FAILED");
    expect(emit).toHaveBeenCalledWith("payment.failed", expect.objectContaining({ payment }));
  });
});
