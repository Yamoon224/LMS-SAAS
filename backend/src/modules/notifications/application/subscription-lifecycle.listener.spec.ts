import type { UsersFacade } from "@modules/users/users.facade";

import { NotifyUserUseCase } from "./notify-user.use-case";
import { SubscriptionLifecycleListener } from "./subscription-lifecycle.listener";

describe("SubscriptionLifecycleListener", () => {
  const date = new Date("2026-03-15T12:00:00Z");
  const formatted = date.toLocaleDateString("fr-FR");

  let notify: { execute: jest.Mock };
  let users: { findTenantOwner: jest.Mock };
  let listener: SubscriptionLifecycleListener;

  beforeEach(() => {
    notify = { execute: jest.fn().mockResolvedValue(undefined) };
    users = { findTenantOwner: jest.fn().mockResolvedValue({ id: "owner-1" }) };
    listener = new SubscriptionLifecycleListener(
      notify as unknown as NotifyUserUseCase,
      users as unknown as UsersFacade,
    );
  });

  it("notifies the owner of a renewal reminder with a formatted date", async () => {
    await listener.onRenewalReminderDue({ tenantId: "t1", daysUntilRenewal: 7, currentPeriodEnd: date } as never);

    expect(users.findTenantOwner).toHaveBeenCalledWith("t1");
    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.renewal-reminder-due",
      payload: { daysUntilRenewal: 7, currentPeriodEnd: formatted },
    });
  });

  it("notifies the owner when the grace period starts", async () => {
    await listener.onEnteredGracePeriod({ tenantId: "t1", graceEndsAt: date } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.entered-grace-period",
      payload: { graceEndsAt: formatted },
    });
  });

  it("notifies the owner of an expiration with an empty payload", async () => {
    await listener.onExpired({ tenantId: "t1" } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.expired",
      payload: {},
    });
  });

  it("sends the renewal payment link with the due date", async () => {
    await listener.onRenewalPaymentRequested({
      tenantId: "t1",
      amount: 5000,
      currency: "XOF",
      checkoutUrl: "https://pay/x",
      dueDate: date,
    } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.renewal-payment-link",
      payload: { amount: 5000, currency: "XOF", paymentUrl: "https://pay/x", dueDate: formatted },
    });
  });

  it("sends the renewal payment link with an empty due date when none is given", async () => {
    await listener.onRenewalPaymentRequested({
      tenantId: "t1",
      amount: 5000,
      currency: "XOF",
      checkoutUrl: "https://pay/x",
      dueDate: null,
    } as never);

    expect(notify.execute).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ dueDate: "" }) }),
    );
  });

  it("ignores a renewal payment request without checkout url", async () => {
    await listener.onRenewalPaymentRequested({ tenantId: "t1", checkoutUrl: null } as never);

    expect(users.findTenantOwner).not.toHaveBeenCalled();
    expect(notify.execute).not.toHaveBeenCalled();
  });

  it("notifies the owner of a renewal", async () => {
    await listener.onRenewed({ tenantId: "t1", newPeriodEnd: date } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.renewed",
      payload: { newPeriodEnd: formatted },
    });
  });

  it("notifies the owner of an admin period extension", async () => {
    await listener.onPeriodExtended({ tenantId: "t1", newPeriodEnd: date } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.period-extended",
      payload: { newPeriodEnd: formatted },
    });
  });

  it("describes a percentage discount", async () => {
    await listener.onDiscountChanged({ tenantId: "t1", percent: 15, amount: null, periods: 2 } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.discount-applied",
      payload: { discount: "15 %", periods: 2 },
    });
  });

  it("describes a fixed amount discount", async () => {
    await listener.onDiscountChanged({ tenantId: "t1", percent: null, amount: 500, periods: 1 } as never);

    expect(notify.execute).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { discount: "500", periods: 1 } }),
    );
  });

  it("falls back to 0 when a discount carries neither percent nor amount", async () => {
    await listener.onDiscountChanged({ tenantId: "t1", percent: null, amount: null, periods: 1 } as never);

    expect(notify.execute).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { discount: "0", periods: 1 } }),
    );
  });

  it("sends nothing when a discount is removed", async () => {
    await listener.onDiscountChanged({ tenantId: "t1", percent: null, amount: null, periods: 0 } as never);

    expect(users.findTenantOwner).not.toHaveBeenCalled();
    expect(notify.execute).not.toHaveBeenCalled();
  });

  it("notifies the owner of an offered plan", async () => {
    await listener.onPlanOffered({ tenantId: "t1", planName: "Pro", periodEnd: date } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.plan-offered",
      payload: { planName: "Pro", periodEnd: formatted },
    });
  });

  it("sends the prorata payment link", async () => {
    await listener.onProrataRequested({
      tenantId: "t1",
      amount: 900,
      currency: "EUR",
      checkoutUrl: "https://pay/p",
    } as never);

    expect(notify.execute).toHaveBeenCalledWith({
      userId: "owner-1",
      templateKey: "subscription.prorata-payment-link",
      payload: { amount: 900, currency: "EUR", paymentUrl: "https://pay/p" },
    });
  });

  it("ignores a prorata request without checkout url", async () => {
    await listener.onProrataRequested({ tenantId: "t1", checkoutUrl: null } as never);

    expect(notify.execute).not.toHaveBeenCalled();
  });

  describe("when the tenant owner cannot be found", () => {
    beforeEach(() => {
      users.findTenantOwner.mockResolvedValue(null);
    });

    it.each([
      ["onRenewalReminderDue", { tenantId: "t1", currentPeriodEnd: date }],
      ["onEnteredGracePeriod", { tenantId: "t1", graceEndsAt: date }],
      ["onExpired", { tenantId: "t1" }],
      ["onRenewalPaymentRequested", { tenantId: "t1", checkoutUrl: "u" }],
      ["onRenewed", { tenantId: "t1", newPeriodEnd: date }],
      ["onPeriodExtended", { tenantId: "t1", newPeriodEnd: date }],
      ["onDiscountChanged", { tenantId: "t1", periods: 1 }],
      ["onPlanOffered", { tenantId: "t1", periodEnd: date }],
      ["onProrataRequested", { tenantId: "t1", checkoutUrl: "u" }],
    ] as const)("%s skips the notification", async (handler, event) => {
      await (listener[handler] as (e: unknown) => Promise<void>).call(listener, event);

      expect(users.findTenantOwner).toHaveBeenCalledWith("t1");
      expect(notify.execute).not.toHaveBeenCalled();
    });
  });
});
