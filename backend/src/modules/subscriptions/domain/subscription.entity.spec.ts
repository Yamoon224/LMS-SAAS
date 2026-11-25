import { InvalidStateTransitionError } from "@shared/errors";

import { SubscriptionStatus } from "./subscription-status";
import { Subscription } from "./subscription.entity";

function buildSubscription(
  status: SubscriptionStatus,
  overrides: Partial<{ graceEndsAt: Date | null; autoRenew: boolean }> = {},
): Subscription {
  return Subscription.fromPersistence({
    id: "sub-1",
    tenantId: "tenant-1",
    planPriceId: "price-1",
    status,
    autoRenew: overrides.autoRenew ?? true,
    startedAt: null,
    currentPeriodEnd: null,
    graceEndsAt: overrides.graceEndsAt ?? null,
    canceledAt: null,
  });
}

describe("Subscription entity - status and grace period", () => {
  it.each([
    [SubscriptionStatus.ACTIVE, true],
    [SubscriptionStatus.TRIALING, true],
    [SubscriptionStatus.GRACE_PERIOD, true],
    [SubscriptionStatus.PENDING_PAYMENT, false],
    [SubscriptionStatus.EXPIRED, false],
    [SubscriptionStatus.CANCELED, false],
    [SubscriptionStatus.SUSPENDED, false],
  ])("isOperational() for %s is %s (RG-01)", (status, expected) => {
    expect(buildSubscription(status).isOperational()).toBe(expected);
  });

  it("enters a 3-day grace period by default on renewal failure (RG-02)", () => {
    const subscription = buildSubscription(SubscriptionStatus.ACTIVE);
    const before = Date.now();
    const { graceEndsAt } = subscription.enterGracePeriod();
    const expectedMs = before + 3 * 24 * 60 * 60 * 1000;

    expect(subscription.status).toBe(SubscriptionStatus.GRACE_PERIOD);
    expect(Math.abs(graceEndsAt.getTime() - expectedMs)).toBeLessThan(5000);
  });

  it("reports elapsed grace period once the date has passed", () => {
    const past = new Date(Date.now() - 1000);
    const subscription = buildSubscription(SubscriptionStatus.GRACE_PERIOD, { graceEndsAt: past });
    expect(subscription.hasGracePeriodElapsed()).toBe(true);
  });

  it("reports grace period not elapsed before the deadline", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60);
    const subscription = buildSubscription(SubscriptionStatus.GRACE_PERIOD, { graceEndsAt: future });
    expect(subscription.hasGracePeriodElapsed()).toBe(false);
  });
});

describe("Subscription entity - lifecycle transitions", () => {
  it("activates a pending subscription and sets the period end (ENT-02)", () => {
    const subscription = buildSubscription(SubscriptionStatus.PENDING_PAYMENT);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    subscription.activate(periodEnd);

    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    expect(subscription.currentPeriodEnd).toEqual(periodEnd);
  });

  it("clears the grace period when reactivated after a successful payment", () => {
    const subscription = buildSubscription(SubscriptionStatus.GRACE_PERIOD, {
      graceEndsAt: new Date(),
    });

    subscription.activate(new Date(Date.now() + 1000 * 60 * 60));

    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it("expires a subscription whose grace period has elapsed (RG-02)", () => {
    const subscription = buildSubscription(SubscriptionStatus.GRACE_PERIOD);
    subscription.expire();
    expect(subscription.status).toBe(SubscriptionStatus.EXPIRED);
  });

  it("rejects expiring a subscription that is not in grace period", () => {
    const subscription = buildSubscription(SubscriptionStatus.ACTIVE);
    expect(() => subscription.expire()).toThrow(InvalidStateTransitionError);
  });

  it("cancels at period end and disables auto-renew (ENT-03, section 8.1)", () => {
    const subscription = buildSubscription(SubscriptionStatus.ACTIVE);
    subscription.cancelAtPeriodEnd();

    expect(subscription.status).toBe(SubscriptionStatus.CANCELED);
    expect(subscription.autoRenew).toBe(false);
  });

  it("allows suspension from any non-terminal status (Admin override)", () => {
    expect(() => buildSubscription(SubscriptionStatus.ACTIVE).suspend()).not.toThrow();
    expect(() => buildSubscription(SubscriptionStatus.TRIALING).suspend()).not.toThrow();
    expect(() => buildSubscription(SubscriptionStatus.GRACE_PERIOD).suspend()).not.toThrow();
  });

  it("rejects activating an already canceled subscription directly", () => {
    const subscription = buildSubscription(SubscriptionStatus.CANCELED);
    expect(() => subscription.activate(new Date())).toThrow(InvalidStateTransitionError);
  });
});
