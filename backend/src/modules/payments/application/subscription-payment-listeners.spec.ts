import type { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";

import type { PaymentType } from "../domain/payment-method";
import { Payment } from "../domain/payment.entity";
import { PaymentFailedEvent, PaymentSucceededEvent } from "../payments.events";

import { HandlePaymentFailedForSubscriptionListener } from "./handle-payment-failed-for-subscription.listener";
import { HandlePaymentSucceededForSubscriptionListener } from "./handle-payment-succeeded-for-subscription.listener";

const payment = (type: PaymentType, subscriptionId: string | null) =>
  Payment.fromPersistence({
    id: "pay-1",
    tenantId: "tenant-1",
    providerId: "prov-1",
    type,
    method: "CARD",
    amount: 10000,
    currency: "XOF",
    providerFee: 0,
    commissionAmount: 0,
    providerReference: "ref-1",
    status: "PENDING",
    subscriptionId,
    enrollmentId: null,
    creditPackId: null,
  });

const facade = () => ({
  confirmSubscriptionPayment: jest.fn().mockResolvedValue(undefined),
  handleRenewalFailure: jest.fn().mockResolvedValue(undefined),
});

describe("HandlePaymentSucceededForSubscriptionListener", () => {
  it("confirme le paiement d'un abonnement", async () => {
    const f = facade();
    await new HandlePaymentSucceededForSubscriptionListener(f as unknown as SubscriptionsFacade).handle(
      new PaymentSucceededEvent(payment("SUBSCRIPTION", "sub-1")),
    );
    expect(f.confirmSubscriptionPayment).toHaveBeenCalledWith("sub-1", "pay-1");
  });

  it.each([
    ["autre type de paiement", payment("CREDIT_PURCHASE", "sub-1")],
    ["abonnement sans subscriptionId", payment("SUBSCRIPTION", null)],
  ])("ignore: %s", async (_label, p) => {
    const f = facade();
    await new HandlePaymentSucceededForSubscriptionListener(f as unknown as SubscriptionsFacade).handle(new PaymentSucceededEvent(p));
    expect(f.confirmSubscriptionPayment).not.toHaveBeenCalled();
  });
});

describe("HandlePaymentFailedForSubscriptionListener", () => {
  it("déclenche la gestion d'échec de renouvellement avec l'id du paiement", async () => {
    const f = facade();
    await new HandlePaymentFailedForSubscriptionListener(f as unknown as SubscriptionsFacade).handle(
      new PaymentFailedEvent(payment("SUBSCRIPTION", "sub-1")),
    );
    expect(f.handleRenewalFailure).toHaveBeenCalledWith("sub-1", "pay-1");
  });

  it.each([
    ["autre type de paiement", payment("CREDIT_PURCHASE", "sub-1")],
    ["abonnement sans subscriptionId", payment("SUBSCRIPTION", null)],
  ])("ignore: %s", async (_label, p) => {
    const f = facade();
    await new HandlePaymentFailedForSubscriptionListener(f as unknown as SubscriptionsFacade).handle(new PaymentFailedEvent(p));
    expect(f.handleRenewalFailure).not.toHaveBeenCalled();
  });
});
