import { InvalidStateTransitionError } from "@shared/errors";

import type { PaymentStatus } from "./payment-method";
import { Payment } from "./payment.entity";

function buildPayment(status: PaymentStatus): Payment {
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
    status,
    subscriptionId: null,
    enrollmentId: "enrollment-1",
    creditPackId: null,
  });
}

describe("Payment entity", () => {
  it("reports pending only when status is PENDING", () => {
    expect(buildPayment("PENDING").isPending()).toBe(true);
    expect(buildPayment("SUCCEEDED").isPending()).toBe(false);
  });

  it("marks a pending payment as succeeded and records the provider fee", () => {
    const payment = buildPayment("PENDING");
    payment.markSucceeded(1250);

    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.providerFee).toBe(1250);
  });

  it("marks a pending payment as failed", () => {
    const payment = buildPayment("PENDING");
    payment.markFailed();
    expect(payment.status).toBe("FAILED");
  });

  it("rejects marking an already failed payment as succeeded (RG-06 idempotence)", () => {
    const payment = buildPayment("FAILED");
    expect(() => payment.markSucceeded(0)).toThrow(InvalidStateTransitionError);
  });

  it("rejects marking an already succeeded payment as succeeded again", () => {
    const payment = buildPayment("SUCCEEDED");
    expect(() => payment.markSucceeded(0)).toThrow(InvalidStateTransitionError);
  });

  it("allows refunding a succeeded payment", () => {
    const payment = buildPayment("SUCCEEDED");
    payment.markRefunded();
    expect(payment.status).toBe("REFUNDED");
  });

  it("rejects refunding a payment that never succeeded", () => {
    const payment = buildPayment("PENDING");
    expect(() => payment.markRefunded()).toThrow(InvalidStateTransitionError);
  });

  it("rejects refunding an already fully refunded payment", () => {
    const payment = buildPayment("REFUNDED");
    expect(() => payment.markRefunded()).toThrow(InvalidStateTransitionError);
  });
});

describe("Payment entity (accesseurs et motif d'échec)", () => {
  it("expose les données de persistance", () => {
    const payment = buildPayment("PENDING");
    expect(payment.id).toBe("payment-1");
    expect(payment.tenantId).toBe("tenant-1");
    expect(payment.providerId).toBe("provider-1");
    expect(payment.providerReference).toBe("ref-123");
    expect(payment.amount).toBe(50000);
    expect(payment.currency).toBe("XOF");
    expect(payment.commissionAmount).toBe(0);
    expect(payment.type).toBe("COURSE_ENROLLMENT");
    expect(payment.subscriptionId).toBeNull();
    expect(payment.enrollmentId).toBe("enrollment-1");
    expect(payment.creditPackId).toBeNull();
  });

  it("enregistre le motif d'un échec décidé par la plateforme", () => {
    const payment = buildPayment("PENDING");
    expect(payment.failureReason).toBeNull();
    payment.markFailed("expiré");
    expect(payment.failureReason).toBe("expiré");
  });

  it("passe un paiement réussi en PARTIALLY_REFUNDED puis REFUNDED", () => {
    const payment = buildPayment("SUCCEEDED");
    payment.markPartiallyRefunded();
    expect(payment.status).toBe("PARTIALLY_REFUNDED");
    payment.markRefunded();
    expect(payment.status).toBe("REFUNDED");
  });

  it("refuse un second remboursement partiel sur un paiement déjà partiellement remboursé", () => {
    const payment = buildPayment("PARTIALLY_REFUNDED");
    expect(() => payment.markPartiallyRefunded()).toThrow(InvalidStateTransitionError);
  });
});
