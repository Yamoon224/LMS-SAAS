import type { EventEmitter2 } from "@nestjs/event-emitter";

import { SubscriptionStatus } from "../domain/subscription-status";
import { Subscription } from "../domain/subscription.entity";
import type { RenewalStatus } from "../domain/subscription.entity";
import type {
  PlanPriceSelection,
  RenewalClaimExpectation,
  SubscriptionRepositoryPort,
} from "../domain/subscription.repository.port";

import { ChangePlanUseCase } from "./change-plan.use-case";
import { CancelPendingPlanChangeUseCase } from "./plan-change.use-cases";
import {
  BeginRenewalUseCase,
  ConfirmSubscriptionPaymentUseCase,
  EndNonRenewingSubscriptionsUseCase,
  FailRenewalUseCase,
  ListRenewalCandidatesUseCase,
} from "./renewal.use-cases";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function price(id: string, amount: number, period = "MONTHLY"): PlanPriceSelection {
  return {
    id,
    planIsPublic: true,
    planIsArchived: false,
    isActive: true,
    amount,
    currency: "XOF",
    period,
    trialDays: 0,
  };
}

const PRICES: Record<string, PlanPriceSelection> = {
  basic: price("basic", 10_000),
  pro: price("pro", 25_000),
  free: price("free", 0),
};

function build(overrides: Partial<Parameters<typeof Subscription.fromPersistence>[0]> = {}): Subscription {
  return Subscription.fromPersistence({
    id: "sub-1",
    tenantId: "tenant-1",
    planPriceId: "pro",
    status: SubscriptionStatus.ACTIVE,
    autoRenew: true,
    startedAt: day("2026-10-01"),
    currentPeriodEnd: day("2026-12-01"),
    graceEndsAt: null,
    canceledAt: null,
    ...overrides,
  });
}

/** Dépôt en mémoire dont `claimRenewalRequest` reproduit la mise à jour conditionnelle de Prisma. */
function fakeRepository(subscription: Subscription) {
  let stored = subscription.toSnapshot();
  const load = () => Subscription.fromPersistence({ ...stored });
  const repository: SubscriptionRepositoryPort = {
    findPlanPriceSelection: async (id) => PRICES[id] ?? null,
    findById: async () => load(),
    findLatestForTenant: async () => load(),
    findActiveForTenant: async () => load(),
    findLatestForTenantWithPlanDetails: async () => null,
    create: async () => load(),
    save: async (s) => {
      stored = { ...s.toSnapshot() };
    },
    listDueForRenewal: async () => [],
    listGraceElapsed: async () => [],
    listRenewalCandidates: async () => [load()],
    listNonRenewingEnded: async (now) =>
      stored.status === "ACTIVE" && !stored.autoRenew && stored.currentPeriodEnd && stored.currentPeriodEnd < now
        ? [load()]
        : [],
    claimRenewalRequest: async (s, expected: RenewalClaimExpectation) => {
      const same =
        stored.status === expected.status &&
        (stored.renewalForPeriodEnd ?? null)?.getTime() === expected.renewalForPeriodEnd?.getTime() &&
        (stored.lastRenewalStatus ?? null) === expected.lastRenewalStatus &&
        (stored.lastRenewalAt ?? null)?.getTime() === expected.lastRenewalAt?.getTime();
      if (!same) return false;
      const next = s.toSnapshot();
      stored = {
        ...stored,
        renewalForPeriodEnd: next.renewalForPeriodEnd,
        lastRenewalStatus: next.lastRenewalStatus,
        lastRenewalAt: next.lastRenewalAt,
        lastRenewalAmount: next.lastRenewalAmount,
        lastRenewalPaymentId: null,
        lastRenewalCheckoutUrl: null,
      };
      return true;
    },
  };
  return { repository, snapshot: () => stored, load };
}

function events() {
  const emitted: string[] = [];
  const emitter = { emit: (name: string) => emitted.push(name) } as unknown as EventEmitter2;
  return { emitter, emitted };
}

describe("Renouvellement automatique", () => {
  const now = new Date("2026-12-01T01:00:00.000Z");

  it("réserve l'échéance une seule fois (idempotence) et renvoie le montant du prix courant", async () => {
    const { repository, snapshot } = fakeRepository(build());
    const { emitter } = events();
    const begin = new BeginRenewalUseCase(repository, emitter);

    const first = await begin.execute("sub-1", now);
    expect(first).toMatchObject({ amount: 25_000, currency: "XOF", subscriptionId: "sub-1" });
    expect(snapshot().lastRenewalStatus).toBe("PENDING");

    expect(await begin.execute("sub-1", now)).toBeNull();
    expect(await begin.execute("sub-1", new Date("2026-12-01T05:00:00.000Z"))).toBeNull();
  });

  it("deux passages concurrents : un seul gagne la réservation", async () => {
    const { repository } = fakeRepository(build());
    const { emitter } = events();
    const begin = new BeginRenewalUseCase(repository, emitter);
    const results = await Promise.all([begin.execute("sub-1", now), begin.execute("sub-1", now)]);
    expect(results.filter((quote) => quote !== null)).toHaveLength(1);
  });

  it("n'est pas dû avant l'échéance ni sans renouvellement automatique", async () => {
    const early = fakeRepository(build());
    expect(
      await new BeginRenewalUseCase(early.repository, events().emitter).execute("sub-1", day("2026-11-20")),
    ).toBeNull();

    const off = fakeRepository(build({ autoRenew: false }));
    expect(await new BeginRenewalUseCase(off.repository, events().emitter).execute("sub-1", now)).toBeNull();
    expect(await new ListRenewalCandidatesUseCase(off.repository).execute(now)).toEqual([]);
  });

  it("facture le prix du changement planifié et l'applique au paiement confirmé", async () => {
    const sub = build();
    sub.schedulePlanChange("basic");
    const { repository, snapshot, load } = fakeRepository(sub);
    const { emitter, emitted } = events();

    const quote = await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    expect(quote?.amount).toBe(10_000);

    const attached = load();
    attached.attachRenewalPayment("pay-1", "https://pay/1");
    await repository.save(attached);

    await new ConfirmSubscriptionPaymentUseCase(repository, emitter).execute("sub-1", "pay-1", now);
    const after = snapshot();
    expect(after.planPriceId).toBe("basic");
    expect(after.pendingPlanPriceId).toBeNull();
    expect(after.status).toBe("ACTIVE");
    expect(after.currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-01");
    expect(after.lastRenewalStatus).toBe<RenewalStatus>("SUCCEEDED");
    expect(emitted).toContain("subscription.renewed");
  });

  it("un paiement qui n'est pas celui du renouvellement (prorata) ne prolonge rien", async () => {
    const { repository, snapshot } = fakeRepository(build());
    await new ConfirmSubscriptionPaymentUseCase(repository, events().emitter).execute("sub-1", "prorata-pay", now);
    expect(snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2026-12-01");
  });

  it("le même paiement confirmé deux fois ne prolonge qu'une fois", async () => {
    const { repository, snapshot, load } = fakeRepository(build());
    const { emitter } = events();
    await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    const attached = load();
    attached.attachRenewalPayment("pay-1", null);
    await repository.save(attached);

    const confirm = new ConfirmSubscriptionPaymentUseCase(repository, emitter);
    await confirm.execute("sub-1", "pay-1", now);
    await confirm.execute("sub-1", "pay-1", now);
    expect(snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("prix nul : renouvelé immédiatement sans paiement", async () => {
    const { repository, snapshot } = fakeRepository(build({ planPriceId: "free" }));
    const { emitter, emitted } = events();
    expect(await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now)).toBeNull();
    expect(snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-01");
    expect(emitted).toContain("subscription.renewed");
  });

  it("échec : période de grâce (RG-02), une seule fois, ignoré pour un autre paiement", async () => {
    const { repository, snapshot, load } = fakeRepository(build());
    const { emitter, emitted } = events();
    await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    const attached = load();
    attached.attachRenewalPayment("pay-1", "https://pay/1");
    await repository.save(attached);

    const fail = new FailRenewalUseCase(repository, emitter);
    await fail.execute("sub-1", "other-payment", undefined, now);
    expect(snapshot().status).toBe("ACTIVE");

    await fail.execute("sub-1", "pay-1", undefined, now);
    expect(snapshot().status).toBe("GRACE_PERIOD");
    expect(snapshot().lastRenewalStatus).toBe("FAILED");
    expect(emitted).toEqual(
      expect.arrayContaining(["subscription.entered-grace-period", "subscription.grace-period-started"]),
    );

    const countBefore = emitted.length;
    await fail.execute("sub-1", "pay-1", undefined, now);
    expect(emitted).toHaveLength(countBefore);
  });

  it("en grâce : relance possible seulement 24 h après l'échec, et le paiement réussi réactive", async () => {
    const { repository, snapshot, load } = fakeRepository(build());
    const { emitter } = events();
    await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    let current = load();
    current.attachRenewalPayment("pay-1", null);
    await repository.save(current);
    await new FailRenewalUseCase(repository, emitter).execute("sub-1", "pay-1", undefined, now);

    const begin = new BeginRenewalUseCase(repository, emitter);
    expect(await begin.execute("sub-1", new Date("2026-12-01T10:00:00.000Z"))).toBeNull();
    const retry = await begin.execute("sub-1", new Date("2026-12-02T02:00:00.000Z"));
    expect(retry).not.toBeNull();

    current = load();
    current.attachRenewalPayment("pay-2", null);
    await repository.save(current);
    await new ConfirmSubscriptionPaymentUseCase(repository, emitter).execute(
      "sub-1",
      "pay-2",
      new Date("2026-12-02T03:00:00.000Z"),
    );
    expect(snapshot().status).toBe("ACTIVE");
    expect(snapshot().graceEndsAt).toBeNull();
    expect(snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("sans renouvellement automatique, l'abonnement prend fin à l'échéance et la descente planifiée tombe", async () => {
    const sub = build({ autoRenew: false });
    sub.schedulePlanChange("basic");
    const { repository, snapshot } = fakeRepository(sub);
    const { emitter, emitted } = events();
    expect(await new EndNonRenewingSubscriptionsUseCase(repository, emitter).execute(now)).toBe(1);
    expect(snapshot().status).toBe("CANCELED");
    expect(snapshot().pendingPlanPriceId).toBeNull();
    expect(emitted).toContain("subscription.expired");
  });
});

describe("Changement de plan : planification de la descente", () => {
  const now = new Date("2026-11-16T00:00:00.000Z");

  it("persiste la descente à l'échéance courante, sans effet immédiat", async () => {
    const { repository, snapshot } = fakeRepository(build());
    const { emitter, emitted } = events();
    const result = await new ChangePlanUseCase(repository, emitter).execute({
      tenantId: "tenant-1",
      newPlanPriceId: "basic",
      isUpgrade: false,
      selfService: true,
      now,
    });
    expect(result.immediate).toBe(false);
    expect(result.scheduledFor?.toISOString()).toBe(day("2026-12-01").toISOString());
    expect(snapshot().planPriceId).toBe("pro");
    expect(snapshot().pendingPlanPriceId).toBe("basic");
    expect(snapshot().pendingChangeAt?.toISOString()).toBe(day("2026-12-01").toISOString());
    expect(emitted).toContain("subscription.plan-change-scheduled");
  });

  it("annulable tant qu'il n'est pas appliqué ; seconde annulation refusée", async () => {
    const { repository, snapshot } = fakeRepository(build());
    const { emitter } = events();
    await new ChangePlanUseCase(repository, emitter).execute({
      tenantId: "tenant-1",
      newPlanPriceId: "basic",
      isUpgrade: false,
      selfService: true,
      now,
    });
    const cancel = new CancelPendingPlanChangeUseCase(repository, emitter);
    await cancel.execute("tenant-1");
    expect(snapshot().pendingPlanPriceId).toBeNull();
    await expect(cancel.execute("tenant-1")).rejects.toThrow();
  });

  it("montée en gamme : appliquée tout de suite avec prorata, planification précédente écrasée", async () => {
    const sub = build({ planPriceId: "basic" });
    sub.schedulePlanChange("free");
    const { repository, snapshot } = fakeRepository(sub);
    const { emitter } = events();
    const result = await new ChangePlanUseCase(repository, emitter).execute({
      tenantId: "tenant-1",
      newPlanPriceId: "pro",
      isUpgrade: true,
      selfService: true,
      now,
    });
    expect(result.immediate).toBe(true);
    expect(result.proration?.amountDue).toBe(7_500);
    expect(snapshot().planPriceId).toBe("pro");
    expect(snapshot().pendingPlanPriceId).toBeNull();
  });

  it("revenir au plan courant annule la planification", async () => {
    const sub = build();
    sub.schedulePlanChange("basic");
    const { repository, snapshot } = fakeRepository(sub);
    await new ChangePlanUseCase(repository, events().emitter).execute({
      tenantId: "tenant-1",
      newPlanPriceId: "pro",
      isUpgrade: false,
      selfService: true,
      now,
    });
    expect(snapshot().pendingPlanPriceId).toBeNull();
  });
});

describe("Renouvellement avec remise Admin (ADM-09)", () => {
  const now = new Date("2026-12-01T01:00:00.000Z");

  it("facture le montant remisé et décompte une période au renouvellement réussi", async () => {
    const { repository, snapshot } = fakeRepository(
      build({ discountPercent: 20, discountPeriodsRemaining: 2 }),
    );
    const { emitter } = events();
    const quote = await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    expect(quote).toMatchObject({ amount: 20_000 }); // 25 000 - 20 %
    expect(snapshot().lastRenewalAmount).toBe(20_000);
    expect(snapshot().discountPeriodsRemaining).toBe(2); // pas encore consommée : le paiement n'a pas abouti

    await repository.save(
      (() => {
        const sub = Subscription.fromPersistence({ ...snapshot(), lastRenewalPaymentId: "pay-1" });
        return sub;
      })(),
    );
    await new ConfirmSubscriptionPaymentUseCase(repository, emitter).execute("sub-1", "pay-1", now);
    expect(snapshot().discountPeriodsRemaining).toBe(1);
    expect(snapshot().discountPercent).toBe(20);
  });

  it("la dernière période remisée efface la remise", async () => {
    const { repository, snapshot } = fakeRepository(
      build({ discountAmount: 5_000, discountPeriodsRemaining: 1, lastRenewalStatus: "PENDING", lastRenewalPaymentId: "pay-9" }),
    );
    await new ConfirmSubscriptionPaymentUseCase(repository, events().emitter).execute("sub-1", "pay-9", now);
    expect(snapshot().discountAmount).toBeNull();
    expect(snapshot().discountPeriodsRemaining).toBeNull();
  });

  it("une remise de 100 % renouvelle sans paiement et consomme la période", async () => {
    const { repository, snapshot } = fakeRepository(build({ discountPercent: 100, discountPeriodsRemaining: 1 }));
    const { emitter, emitted } = events();
    const quote = await new BeginRenewalUseCase(repository, emitter).execute("sub-1", now);
    expect(quote).toBeNull();
    expect(emitted).toContain("subscription.renewed");
    expect(snapshot().lastRenewalStatus).toBe("SUCCEEDED");
    expect(snapshot().discountPeriodsRemaining).toBeNull();
    expect(snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("sans période restante, la remise n'est plus appliquée", async () => {
    const { repository } = fakeRepository(build({ discountPercent: 50, discountPeriodsRemaining: 0 }));
    const quote = await new BeginRenewalUseCase(repository, events().emitter).execute("sub-1", now);
    expect(quote).toMatchObject({ amount: 25_000 });
  });
});
