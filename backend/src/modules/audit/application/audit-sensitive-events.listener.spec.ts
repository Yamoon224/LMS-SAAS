import { UsersFacade } from "@modules/users/users.facade";

import { AuditSensitiveEventsListener } from "./audit-sensitive-events.listener";
import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";

type Handler = keyof AuditSensitiveEventsListener;
type Obj = Record<string, unknown>;

/** [handler, event reçu, entrée d'audit attendue] */
type Case = [Handler, Obj, Obj];

const T = "t1";
const entry = (tenantId: string | null, actorId: string | null, action: string, objectType: string, objectId: string, extra: Obj = {}): Obj => ({
  tenantId,
  actorId,
  action,
  objectType,
  objectId,
  ...extra,
});

describe("AuditSensitiveEventsListener", () => {
  let record: { execute: jest.Mock };
  let users: { findById: jest.Mock };
  let listener: AuditSensitiveEventsListener;

  beforeEach(() => {
    record = { execute: jest.fn().mockResolvedValue(undefined) };
    users = { findById: jest.fn().mockResolvedValue({ tenantId: "t-user" }) };
    listener = new AuditSensitiveEventsListener(
      record as unknown as RecordAuditEntryUseCase,
      users as unknown as UsersFacade,
    );
  });

  async function fire(handler: Handler, event: Obj): Promise<void> {
    await (listener[handler] as (e: unknown) => Promise<void>).call(listener, event);
  }

  const cases: Case[] = [
    ["onTenantSuspended", { tenantId: T }, entry(T, null, "tenant.suspended", "Tenant", T)],
    ["onTenantArchived", { tenantId: T, actorId: "a1" }, entry(T, "a1", "tenant.archived", "Tenant", T)],
    [
      "onUserAdminAction",
      { tenantId: T, actorId: "a1", userId: "u1", action: "invitation-resent" },
      entry(T, "a1", "user.invitation-resent", "User", "u1"),
    ],
    [
      "onTenantOwnershipTransferred",
      { tenantId: T, actorId: "a1", newOwnerUserId: "n", previousOwnerUserIds: ["p1", "p2"] },
      entry(T, "a1", "tenant.ownership-transferred", "Tenant", T, {
        after: { newOwnerUserId: "n", previousOwnerUserIds: ["p1", "p2"] },
      }),
    ],
    [
      "onSubscriptionPeriodExtended",
      { tenantId: T, actorId: "a1", subscriptionId: "s1", previousPeriodEnd: "old", newPeriodEnd: "new", reason: "r" },
      entry(T, "a1", "subscription.period-extended", "Subscription", "s1", {
        before: { currentPeriodEnd: "old" },
        after: { currentPeriodEnd: "new", reason: "r" },
      }),
    ],
    [
      "onSubscriptionDiscountChanged",
      { tenantId: T, actorId: "a1", subscriptionId: "s1", percent: 10, amount: null, periods: 3, reason: "r" },
      entry(T, "a1", "subscription.discount-applied", "Subscription", "s1", {
        after: { percent: 10, amount: null, periods: 3, reason: "r" },
      }),
    ],
    [
      "onSubscriptionDiscountChanged",
      { tenantId: T, actorId: "a1", subscriptionId: "s1", percent: null, amount: null, periods: 0, reason: "r" },
      entry(T, "a1", "subscription.discount-removed", "Subscription", "s1", {
        after: { percent: null, amount: null, periods: 0, reason: "r" },
      }),
    ],
    [
      "onSubscriptionPlanOffered",
      { tenantId: T, actorId: "a1", subscriptionId: "s1", planPriceId: "pp", periodEnd: "end", reason: "r" },
      entry(T, "a1", "subscription.plan-offered", "Subscription", "s1", {
        after: { planPriceId: "pp", periodEnd: "end", reason: "r" },
      }),
    ],
    [
      "onPlanUpdated",
      { actorId: "a1", planId: "p1", changedFields: ["name"] },
      entry(null, "a1", "plan.updated", "Plan", "p1", { after: { changedFields: ["name"] } }),
    ],
    ["onPlanArchived", { actorId: "a1", planId: "p1", archived: true }, entry(null, "a1", "plan.archived", "Plan", "p1")],
    ["onPlanArchived", { actorId: "a1", planId: "p1", archived: false }, entry(null, "a1", "plan.unarchived", "Plan", "p1")],
    [
      "onMediaAssetRejected",
      { tenantId: T, mediaAssetId: "m1", reason: "INFECTED" },
      entry(T, null, "media.rejected", "MediaAsset", "m1", { after: { reason: "INFECTED" } }),
    ],
    [
      "onLearnerDataExported",
      { tenantId: T, userId: "u1", counts: { notes: 2 } },
      entry(T, null, "privacy.data-exported", "User", "u1", { after: { notes: 2 } }),
    ],
    [
      "onLearnerAccountDeleted",
      { tenantId: T, userId: "u1", origin: "SELF" },
      entry(T, null, "privacy.account-deleted", "User", "u1", { after: { origin: "SELF" } }),
    ],
    [
      "onExpiredPersonalDataPurged",
      { notificationsDeleted: 4, accountsAnonymized: 1 },
      entry(null, null, "privacy.expired-data-purged", "Platform", "retention", {
        after: { notificationsDeleted: 4, accountsAnonymized: 1 },
      }),
    ],
    ["onCoursePublished", { tenantId: T, courseId: "c1" }, entry(T, null, "course.published", "Course", "c1")],
    ["onCourseArchived", { tenantId: T, courseId: "c1" }, entry(T, null, "course.archived", "Course", "c1")],
    [
      "onAttestationIssued",
      { tenantId: T, attestationId: "at1", courseTitle: "C", learnerUserId: "l1" },
      entry(T, null, "attestation.issued", "Attestation", "at1", { after: { courseTitle: "C", learnerUserId: "l1" } }),
    ],
    [
      "onAttestationRevoked",
      { tenantId: T, actorId: "a1", attestationId: "at1", reason: "fraud" },
      entry(T, "a1", "attestation.revoked", "Attestation", "at1", { after: { reason: "fraud" } }),
    ],
    [
      "onLiveAttendanceMarked",
      { tenantId: T, actorId: "a1", liveSessionId: "ls1", learnerUserId: "l1", present: true },
      entry(T, "a1", "live-attendance.marked", "LiveSession", "ls1", { after: { learnerUserId: "l1", present: true } }),
    ],
    [
      "onPaymentFailed",
      { payment: { tenantId: T, id: "pay1", amount: 100, currency: "EUR", type: "SUBSCRIPTION" } },
      entry(T, null, "payment.failed", "Payment", "pay1", { after: { amount: 100, currency: "EUR", type: "SUBSCRIPTION" } }),
    ],
    [
      "onRefundProcessed",
      { payment: { tenantId: T, id: "pay1", amount: 100, currency: "EUR" } },
      entry(T, null, "payment.refund-processed", "Payment", "pay1", { after: { amount: 100, currency: "EUR" } }),
    ],
    [
      "onPlanChanged",
      { tenantId: T, subscriptionId: "s1", newPlanPriceId: "pp", immediate: true },
      entry(T, null, "subscription.plan-changed", "Subscription", "s1", { after: { newPlanPriceId: "pp", immediate: true } }),
    ],
    [
      "onPlanChangeScheduled",
      { tenantId: T, subscriptionId: "s1", newPlanPriceId: "pp", immediate: false },
      entry(T, null, "subscription.plan-change-scheduled", "Subscription", "s1", {
        after: { newPlanPriceId: "pp", immediate: false },
      }),
    ],
    [
      "onGracePeriod",
      { tenantId: T, subscriptionId: "s1", graceEndsAt: "g" },
      entry(T, null, "subscription.grace-period-started", "Subscription", "s1", { after: { graceEndsAt: "g" } }),
    ],
    ["onSubscriptionExpired", { tenantId: T, subscriptionId: "s1" }, entry(T, null, "subscription.expired", "Subscription", "s1")],
    [
      "onPayoutRequested",
      { tenantId: T, payoutId: "po1", automatic: true },
      entry(T, null, "payout.requested", "Payout", "po1", { after: { automatic: true } }),
    ],
    ["onPayoutRequested", { tenantId: T, payoutId: "po1", automatic: false }, entry(T, null, "payout.requested", "Payout", "po1")],
    [
      "onFinanceSettingChanged",
      { actorUserId: "a1", field: "commission", previousValue: 5, newValue: 7 },
      entry(null, "a1", "finance-setting.changed", "FinanceSetting", "commission", {
        before: { value: 5 },
        after: { value: 7 },
      }),
    ],
    [
      "onWebhookReplayed",
      { actorUserId: "a1", webhookEventId: "w1", providerCode: "STRIPE", outcome: "PROCESSED" },
      entry(null, "a1", "payment.webhook-replayed", "WebhookEvent", "w1", {
        after: { providerCode: "STRIPE", outcome: "PROCESSED" },
      }),
    ],
    ["onPayoutExecuted", { tenantId: T, payoutId: "po1" }, entry(T, null, "payout.executed", "Payout", "po1")],
    [
      "onTenantSettingsChanged",
      { tenantId: T, actorId: "a1", changedFields: ["iban"] },
      entry(T, "a1", "tenant.settings-changed", "Tenant", T, { after: { changedFields: ["iban"] } }),
    ],
    [
      "onIntegrationChanged",
      { actorId: "a1", kind: "RESET", provider: "STRIPE", changedFields: ["key"] },
      entry(null, "a1", "integration.reset", "Integration", "STRIPE", { after: { changedFields: ["key"] } }),
    ],
    [
      "onIntegrationChanged",
      { actorId: "a1", kind: "UPDATE", provider: "STRIPE", changedFields: ["key"] },
      entry(null, "a1", "integration.updated", "Integration", "STRIPE", { after: { changedFields: ["key"] } }),
    ],
    ["onTwoFactorEnabled", { tenantId: T, userId: "u1" }, entry(T, "u1", "auth.two-factor-enabled", "User", "u1")],
    ["onTwoFactorDisabled", { tenantId: T, userId: "u1" }, entry(T, "u1", "auth.two-factor-disabled", "User", "u1")],
    ["onTwoFactorReset", { tenantId: T, actorId: "a1", targetUserId: "u2" }, entry(T, "a1", "auth.two-factor-reset", "User", "u2")],
    ["onTwoFactorRecoveryUsed", { tenantId: T, userId: "u1" }, entry(T, "u1", "auth.two-factor-recovery-used", "User", "u1")],
  ];

  it.each(cases.map((c, i) => [`${c[0]} #${i}`, ...c] as const))("%s records the expected audit entry", async (_n, handler, event, expected) => {
    await fire(handler, event);

    expect(record.execute).toHaveBeenCalledTimes(1);
    expect(record.execute).toHaveBeenCalledWith(expected);
    expect(users.findById).not.toHaveBeenCalled();
  });

  describe("handlers resolving the tenant through UsersFacade", () => {
    const resolved: Array<[Handler, Obj, Obj]> = [
      ["onUserSuspended", { userId: "u1", actorId: "a1" }, { actorId: "a1", action: "user.suspended", objectType: "User", objectId: "u1" }],
      ["onUserReactivated", { userId: "u1", actorId: "a1" }, { actorId: "a1", action: "user.reactivated", objectType: "User", objectId: "u1" }],
      ["onUserDeactivated", { userId: "u1" }, { actorId: null, action: "user.deactivated", objectType: "User", objectId: "u1" }],
      [
        "onCertificateIssued",
        { learnerUserId: "u1", certificateId: "cert1", courseTitle: "C" },
        {
          actorId: null,
          action: "certificate.issued",
          objectType: "Certificate",
          objectId: "cert1",
          after: { courseTitle: "C", learnerUserId: "u1" },
        },
      ],
    ];

    it.each(resolved)("%s uses the tenant of the resolved user", async (handler, event, expected) => {
      await fire(handler, event);

      expect(users.findById).toHaveBeenCalledWith("u1");
      expect(record.execute).toHaveBeenCalledWith({ tenantId: "t-user", ...expected });
    });

    it.each(resolved)("%s falls back to a null tenant when the user is unknown", async (handler, event, expected) => {
      users.findById.mockResolvedValue(null);

      await fire(handler, event);

      expect(record.execute).toHaveBeenCalledWith({ tenantId: null, ...expected });
    });
  });

  it("propagates a failure of the audit use case", async () => {
    record.execute.mockRejectedValue(new Error("db down"));

    await expect(fire("onTenantSuspended", { tenantId: T })).rejects.toThrow("db down");
  });
});
