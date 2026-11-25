import type { EventEmitter2 } from "@nestjs/event-emitter";

import { SubscriptionStatus } from "../domain/subscription-status";
import { Subscription } from "../domain/subscription.entity";
import type { PlanPriceSelection, SubscriptionRepositoryPort } from "../domain/subscription.repository.port";

import {
  ApplySubscriptionDiscountUseCase,
  ExtendSubscriptionPeriodUseCase,
  OfferPlanUseCase,
} from "./admin-subscription.use-cases";
import { EndNonRenewingSubscriptionsUseCase } from "./renewal.use-cases";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const now = day("2026-11-19");

const PRICES: Record<string, PlanPriceSelection> = {
  pro: { id: "pro", planIsPublic: true, planIsArchived: false, isActive: true, amount: 25_000, currency: "XOF", period: "MONTHLY", trialDays: 0, planName: "Pro" },
  vip: { id: "vip", planIsPublic: false, planIsArchived: false, isActive: true, amount: 90_000, currency: "XOF", period: "MONTHLY", trialDays: 0, planName: "VIP" },
};

function build(overrides: Partial<Parameters<typeof Subscription.fromPersistence>[0]> = {}) {
  return Subscription.fromPersistence({
    id: "sub-1",
    tenantId: "t1",
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

function setup(initial: Subscription | null) {
  let stored = initial ? initial.toSnapshot() : null;
  const emitted: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const emitter = {
    emit: (name: string, payload: Record<string, unknown>) => emitted.push({ name, payload }),
  } as unknown as EventEmitter2;
  const operational = ["ACTIVE", "TRIALING", "GRACE_PERIOD"];
  const load = () => (stored ? Subscription.fromPersistence({ ...stored }) : null);
  const repository = {
    findPlanPriceSelection: async (id: string) => PRICES[id] ?? null,
    findById: async () => load(),
    findLatestForTenant: async () => load(),
    findActiveForTenant: async () => (stored && operational.includes(stored.status) ? load() : null),
    create: async (data: { tenantId: string; planPriceId: string; status: SubscriptionStatus }) => {
      stored = build({ id: "sub-new", tenantId: data.tenantId, planPriceId: data.planPriceId, status: data.status, startedAt: null, currentPeriodEnd: null }).toSnapshot();
      return load() as Subscription;
    },
    save: async (s: Subscription) => {
      stored = { ...s.toSnapshot() };
    },
    listNonRenewingEnded: async (at: Date) =>
      stored && stored.status === "ACTIVE" && !stored.autoRenew && stored.currentPeriodEnd && stored.currentPeriodEnd < at
        ? [load() as Subscription]
        : [],
  } as unknown as SubscriptionRepositoryPort;
  return { repository, emitter, emitted, snapshot: () => stored! };
}

describe("ADM-09 : prolonger la période", () => {
  it("ajoute des jours à l'échéance courante sans toucher au renouvellement automatique", async () => {
    const ctx = setup(build());
    const result = await new ExtendSubscriptionPeriodUseCase(ctx.repository, ctx.emitter).execute({
      tenantId: "t1",
      actorId: "admin",
      days: 10,
      now,
    });
    expect(result.currentPeriodEnd.toISOString().slice(0, 10)).toBe("2026-12-11");
    expect(ctx.snapshot().autoRenew).toBe(true);
    expect(ctx.emitted[0]).toMatchObject({ name: "subscription.period-extended", payload: { actorId: "admin" } });
  });

  it("accepte une date, refuse une date antérieure, des jours ET une date, ou une durée excessive", async () => {
    const ctx = setup(build());
    const useCase = new ExtendSubscriptionPeriodUseCase(ctx.repository, ctx.emitter);
    await useCase.execute({ tenantId: "t1", actorId: "a", until: day("2027-01-15"), now });
    expect(ctx.snapshot().currentPeriodEnd?.toISOString().slice(0, 10)).toBe("2027-01-15");
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", until: day("2026-12-01"), now })).rejects.toThrow();
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", days: 5, until: day("2027-03-01"), now })).rejects.toMatchObject({
      code: "ACTION_ABONNEMENT_INVALIDE",
    });
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", days: 400, now })).rejects.toMatchObject({
      code: "ACTION_ABONNEMENT_INVALIDE",
    });
  });

  it("sort de la période de grâce : l'abonnement redevient ACTIVE", async () => {
    const ctx = setup(build({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: day("2026-12-04") }));
    await new ExtendSubscriptionPeriodUseCase(ctx.repository, ctx.emitter).execute({ tenantId: "t1", actorId: "a", days: 30, now });
    expect(ctx.snapshot()).toMatchObject({ status: "ACTIVE", graceEndsAt: null });
  });

  it("refuse sans abonnement actif", async () => {
    const ctx = setup(build({ status: SubscriptionStatus.EXPIRED }));
    await expect(
      new ExtendSubscriptionPeriodUseCase(ctx.repository, ctx.emitter).execute({ tenantId: "t1", actorId: "a", days: 3, now }),
    ).rejects.toThrow();
  });
});

describe("ADM-09 : remise", () => {
  it("pose une remise en pourcentage sur N périodes, puis la retire", async () => {
    const ctx = setup(build());
    const useCase = new ApplySubscriptionDiscountUseCase(ctx.repository, ctx.emitter);
    await useCase.execute({ tenantId: "t1", actorId: "admin", percent: 30, periods: 3, reason: "geste commercial" });
    expect(ctx.snapshot()).toMatchObject({ discountPercent: 30, discountAmount: null, discountPeriodsRemaining: 3 });
    expect(ctx.emitted[0]?.name).toBe("subscription.discount-changed");

    await useCase.remove("t1", "admin");
    expect(ctx.snapshot()).toMatchObject({ discountPercent: null, discountPeriodsRemaining: null });
  });

  it("exige exactement un pourcentage OU un montant, des bornes valides et refuse un plan offert", async () => {
    const ctx = setup(build());
    const useCase = new ApplySubscriptionDiscountUseCase(ctx.repository, ctx.emitter);
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", periods: 1 })).rejects.toThrow();
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", percent: 10, amount: 500, periods: 1 })).rejects.toThrow();
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", percent: 101, periods: 1 })).rejects.toThrow();
    await expect(useCase.execute({ tenantId: "t1", actorId: "a", percent: 10, periods: 0 })).rejects.toThrow();

    const offered = setup(build({ isComplimentary: true, autoRenew: false }));
    await expect(
      new ApplySubscriptionDiscountUseCase(offered.repository, offered.emitter).execute({ tenantId: "t1", actorId: "a", percent: 10, periods: 1 }),
    ).rejects.toMatchObject({ code: "ACTION_ABONNEMENT_INVALIDE" });
  });
});

describe("ADM-09 : offrir un plan", () => {
  it("exige un motif", async () => {
    const ctx = setup(build());
    await expect(
      new OfferPlanUseCase(ctx.repository, ctx.emitter).execute({ tenantId: "t1", actorId: "a", planPriceId: "vip", days: 30, reason: "  " }),
    ).rejects.toMatchObject({ code: "ACTION_ABONNEMENT_INVALIDE" });
  });

  it("bascule un abonnement existant sur le plan offert, sans renouvellement, puis il prend fin à l'échéance", async () => {
    const ctx = setup(build({ discountPercent: 10, discountPeriodsRemaining: 2 }));
    const result = await new OfferPlanUseCase(ctx.repository, ctx.emitter).execute({
      tenantId: "t1",
      actorId: "admin",
      planPriceId: "vip",
      days: 90,
      reason: "Partenariat ONG",
      now,
    });
    expect(result.currentPeriodEnd.toISOString().slice(0, 10)).toBe("2027-02-17");
    expect(ctx.snapshot()).toMatchObject({
      planPriceId: "vip",
      status: "ACTIVE",
      autoRenew: false,
      isComplimentary: true,
      discountPeriodsRemaining: null,
    });
    expect(ctx.emitted.find((e) => e.name === "subscription.plan-offered")?.payload).toMatchObject({
      reason: "Partenariat ONG",
      planName: "VIP",
    });

    // Aucune demande de paiement : à l'échéance l'abonnement prend fin via la tâche existante.
    const ended = await new EndNonRenewingSubscriptionsUseCase(ctx.repository, ctx.emitter).execute(day("2027-02-18"));
    expect(ended).toBe(1);
    expect(ctx.snapshot().status).toBe("CANCELED");
  });

  it("garde l'échéance déjà payée si elle dépasse la durée offerte", async () => {
    const ctx = setup(build({ currentPeriodEnd: day("2027-06-01") }));
    const result = await new OfferPlanUseCase(ctx.repository, ctx.emitter).execute({
      tenantId: "t1", actorId: "a", planPriceId: "vip", days: 30, reason: "Test long", now,
    });
    expect(result.currentPeriodEnd.toISOString().slice(0, 10)).toBe("2027-06-01");
  });

  it("crée un abonnement actif quand l'entreprise n'en a pas", async () => {
    const ctx = setup(null);
    const result = await new OfferPlanUseCase(ctx.repository, ctx.emitter).execute({
      tenantId: "t9", actorId: "a", planPriceId: "pro", days: 30, reason: "Pilote gratuit", now,
    });
    expect(result.id).toBe("sub-new");
    expect(ctx.snapshot()).toMatchObject({ status: "ACTIVE", isComplimentary: true, autoRenew: false });
    expect(ctx.emitted.map((e) => e.name)).toEqual(["subscription.created", "subscription.plan-offered"]);
  });
});
