import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import { SubscriptionStatus } from "../domain/subscription-status";
import { Subscription } from "../domain/subscription.entity";
import type { SubscriptionProps } from "../domain/subscription.entity";
import type { PlanPriceSelection, SubscriptionRepositoryPort } from "../domain/subscription.repository.port";
import {
  PlanChangeCanceledEvent,
  RenewalPaymentRequestedEvent,
  SubscriptionActivatedEvent,
  SubscriptionEnteredGracePeriodEvent,
  SubscriptionExpiredEvent,
  SubscriptionRenewedEvent,
} from "../subscriptions.events";

import { ActivateSubscriptionUseCase } from "./activate-subscription.use-case";
import { CheckTenantOperationalUseCase } from "./check-tenant-operational.use-case";
import { GetSubscriptionUsageUseCase } from "./get-subscription-usage.use-case";
import { GetTenantSubscriptionUseCase } from "./get-tenant-subscription.use-case";
import { ListRenewalsDueUseCase } from "./list-renewals-due.use-case";
import { CancelPendingPlanChangeUseCase, PreviewPlanChangeUseCase, SetAutoRenewUseCase } from "./plan-change.use-cases";
import { ProcessGracePeriodExpiryUseCase } from "./process-grace-period-expiry.use-case";
import {
  AttachRenewalPaymentUseCase,
  BeginRenewalUseCase,
  ConfirmSubscriptionPaymentUseCase,
  FailRenewalUseCase,
  ListRenewalCandidatesUseCase,
} from "./renewal.use-cases";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function sub(overrides: Partial<SubscriptionProps> = {}): Subscription {
  return Subscription.fromPersistence({
    id: "sub-1",
    tenantId: "tenant-1",
    planPriceId: "pro",
    status: SubscriptionStatus.ACTIVE,
    autoRenew: true,
    startedAt: d("2026-10-01"),
    currentPeriodEnd: d("2026-12-01"),
    graceEndsAt: null,
    canceledAt: null,
    ...overrides,
  });
}

const price = (id: string, amount: number, period = "MONTHLY"): PlanPriceSelection => ({
  id,
  planIsPublic: true,
  planIsArchived: false,
  isActive: true,
  amount,
  currency: "XOF",
  period,
  trialDays: 0,
});

function setup(subscription: Subscription | null, prices: Record<string, PlanPriceSelection> = {}) {
  const repo = {
    findById: jest.fn().mockResolvedValue(subscription),
    findActiveForTenant: jest.fn().mockResolvedValue(subscription),
    findLatestForTenantWithPlanDetails: jest.fn(),
    findPlanPriceSelection: jest.fn().mockImplementation(async (id: string) => prices[id] ?? null),
    save: jest.fn().mockResolvedValue(undefined),
    claimRenewalRequest: jest.fn().mockResolvedValue(true),
    listGraceElapsed: jest.fn(),
    listRenewalCandidates: jest.fn(),
    listDueForRenewal: jest.fn().mockResolvedValue([]),
  };
  const events = { emit: jest.fn() };
  return {
    repo,
    events,
    port: repo as unknown as SubscriptionRepositoryPort,
    emitter: events as unknown as EventEmitter2,
  };
}

describe("ActivateSubscriptionUseCase", () => {
  it("active l'abonnement, persiste puis publie subscription.activated", async () => {
    const s = sub({ status: SubscriptionStatus.PENDING_PAYMENT, startedAt: null, currentPeriodEnd: null });
    const { repo, events, port, emitter } = setup(s);
    await new ActivateSubscriptionUseCase(port, emitter).execute("sub-1", d("2027-01-01"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
    expect(repo.save).toHaveBeenCalledWith(s);
    const [name, payload] = events.emit.mock.calls[0] as [string, SubscriptionActivatedEvent];
    expect(name).toBe("subscription.activated");
    expect(payload).toMatchObject({ subscriptionId: "sub-1", tenantId: "tenant-1" });
  });

  it("lève NotFoundDomainError pour un abonnement inconnu", async () => {
    const { repo, events, port, emitter } = setup(null);
    await expect(new ActivateSubscriptionUseCase(port, emitter).execute("x", d("2027-01-01"))).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("ne persiste ni ne publie quand la transition est invalide", async () => {
    const { repo, events, port, emitter } = setup(sub({ status: SubscriptionStatus.CANCELED }));
    await expect(new ActivateSubscriptionUseCase(port, emitter).execute("sub-1", d("2027-01-01"))).rejects.toBeInstanceOf(
      InvalidStateTransitionError,
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("ProcessGracePeriodExpiryUseCase", () => {
  const graceSub = (id: string) =>
    sub({ id, tenantId: `tenant-${id}`, status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: d("2026-12-04") });

  it("fait expirer chaque abonnement dont la grâce est dépassée et publie un événement par abonnement", async () => {
    const a = graceSub("a");
    const b = graceSub("b");
    const { repo, events, port, emitter } = setup(null);
    repo.listGraceElapsed.mockResolvedValue([a, b]);
    const count = await new ProcessGracePeriodExpiryUseCase(port, emitter).execute(d("2026-12-05"));
    expect(count).toBe(2);
    expect(repo.listGraceElapsed).toHaveBeenCalledWith(d("2026-12-05"));
    expect(a.status).toBe(SubscriptionStatus.EXPIRED);
    expect(b.status).toBe(SubscriptionStatus.EXPIRED);
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(events.emit.mock.calls.map((c) => c[0])).toEqual(["subscription.expired", "subscription.expired"]);
    expect((events.emit.mock.calls[1]?.[1] as SubscriptionExpiredEvent).tenantId).toBe("tenant-b");
  });

  it("ne fait rien quand aucune grâce n'est dépassée", async () => {
    const { repo, events, port, emitter } = setup(null);
    repo.listGraceElapsed.mockResolvedValue([]);
    await expect(new ProcessGracePeriodExpiryUseCase(port, emitter).execute()).resolves.toBe(0);
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("AttachRenewalPaymentUseCase", () => {
  it("rattache le paiement et notifie avec le montant et l'échéance de la demande", async () => {
    const s = sub();
    s.markRenewalRequested(22_500, d("2026-12-02"));
    const { repo, events, port, emitter } = setup(s);
    await new AttachRenewalPaymentUseCase(port, emitter).execute("sub-1", "pay-1", "https://pay/1", "XOF");
    expect(s.lastRenewalPaymentId).toBe("pay-1");
    expect(repo.save).toHaveBeenCalledWith(s);
    const [name, payload] = events.emit.mock.calls[0] as [string, RenewalPaymentRequestedEvent];
    expect(name).toBe("subscription.renewal-payment-requested");
    expect(payload).toMatchObject({
      subscriptionId: "sub-1",
      tenantId: "tenant-1",
      amount: 22_500,
      currency: "XOF",
      checkoutUrl: "https://pay/1",
      dueDate: d("2026-12-01"),
    });
  });

  it("notifie un montant 0 quand aucune demande n'avait de montant", async () => {
    const { events, port, emitter } = setup(sub());
    await new AttachRenewalPaymentUseCase(port, emitter).execute("sub-1", "pay-1", null, "XOF");
    expect(events.emit.mock.calls[0]?.[1]).toMatchObject({ amount: 0, checkoutUrl: null, dueDate: null });
  });

  it("lève NotFoundDomainError pour un abonnement inconnu", async () => {
    const { port, emitter } = setup(null);
    await expect(new AttachRenewalPaymentUseCase(port, emitter).execute("x", "p", null, "XOF")).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
  });
});

describe("ListRenewalCandidatesUseCase", () => {
  it("ne garde que les abonnements pour lesquels une demande peut démarrer", async () => {
    const due = sub({ id: "due" });
    const notDue = sub({ id: "later", currentPeriodEnd: d("2027-01-01") });
    const noAuto = sub({ id: "manual", autoRenew: false });
    const { repo, port } = setup(null);
    repo.listRenewalCandidates.mockResolvedValue([due, notDue, noAuto]);
    await expect(new ListRenewalCandidatesUseCase(port).execute(d("2026-12-02"))).resolves.toEqual(["due"]);
  });
});

describe("BeginRenewalUseCase (cas limites)", () => {
  const now = d("2026-12-02");

  it("lève NotFoundDomainError pour un abonnement inconnu", async () => {
    const { port, emitter } = setup(null);
    await expect(new BeginRenewalUseCase(port, emitter).execute("x", now)).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("renvoie null sans réserver quand le renouvellement n'est pas dû", async () => {
    const { repo, port, emitter } = setup(sub({ currentPeriodEnd: d("2027-01-01") }), { pro: price("pro", 25_000) });
    await expect(new BeginRenewalUseCase(port, emitter).execute("sub-1", now)).resolves.toBeNull();
    expect(repo.claimRenewalRequest).not.toHaveBeenCalled();
  });

  it("lève NotFoundDomainError quand le prix de plan a disparu", async () => {
    const { repo, port, emitter } = setup(sub(), {});
    await expect(new BeginRenewalUseCase(port, emitter).execute("sub-1", now)).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(repo.claimRenewalRequest).not.toHaveBeenCalled();
  });

  it("renvoie le devis exact (montant, devise, échéance) quand la réservation est gagnée", async () => {
    const { repo, port, emitter } = setup(sub(), { pro: price("pro", 25_000) });
    await expect(new BeginRenewalUseCase(port, emitter).execute("sub-1", now)).resolves.toEqual({
      subscriptionId: "sub-1",
      tenantId: "tenant-1",
      amount: 25_000,
      currency: "XOF",
      dueDate: d("2026-12-01"),
    });
    expect(repo.claimRenewalRequest).toHaveBeenCalledTimes(1);
  });

  it("applique une remise en pourcentage au montant facturé (arrondi de la remise à l'inférieur)", async () => {
    const s = sub({ discountPercent: 33, discountPeriodsRemaining: 2 });
    const { port, emitter } = setup(s, { pro: price("pro", 10_001) });
    const quote = await new BeginRenewalUseCase(port, emitter).execute("sub-1", now);
    // remise = floor(10001 * 33 / 100) = 3300 -> 6701
    expect(quote?.amount).toBe(6_701);
  });

  it("renvoie null quand la réservation est perdue (course concurrente)", async () => {
    const { repo, events, port, emitter } = setup(sub(), { pro: price("pro", 25_000) });
    repo.claimRenewalRequest.mockResolvedValue(false);
    await expect(new BeginRenewalUseCase(port, emitter).execute("sub-1", now)).resolves.toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("prix gratuit : renouvelle immédiatement d'un mois depuis l'échéance et publie subscription.renewed", async () => {
    const s = sub({ planPriceId: "free" });
    const { repo, events, port, emitter } = setup(s, { free: price("free", 0) });
    await expect(new BeginRenewalUseCase(port, emitter).execute("sub-1", now)).resolves.toBeNull();
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
    expect(repo.save).toHaveBeenCalledWith(s);
    const [name, payload] = events.emit.mock.calls[0] as [string, SubscriptionRenewedEvent];
    expect(name).toBe("subscription.renewed");
    expect(payload).toMatchObject({ planPriceId: "free", newPeriodEnd: d("2027-01-01") });
  });
});

describe("ConfirmSubscriptionPaymentUseCase (cas limites)", () => {
  const now = d("2026-12-02");
  const awaiting = (over: Partial<SubscriptionProps> = {}) => {
    const s = sub(over);
    s.markRenewalRequested(25_000, d("2026-12-01"));
    s.attachRenewalPayment("pay-1", null);
    return s;
  };

  it("lève NotFoundDomainError pour un abonnement inconnu", async () => {
    const { port, emitter } = setup(null);
    await expect(new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("x", "p", now)).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
  });

  it.each([SubscriptionStatus.SUSPENDED, SubscriptionStatus.CANCELED])(
    "ne prolonge pas un renouvellement payé sur un abonnement %s",
    async (status) => {
      const s = awaiting({ status });
      const { repo, events, port, emitter } = setup(s, { pro: price("pro", 25_000) });
      await new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-1", now);
      expect(repo.save).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
      expect(s.currentPeriodEnd).toEqual(d("2026-12-01"));
    },
  );

  it("lève NotFoundDomainError quand le prix du renouvellement a disparu", async () => {
    const { repo, port, emitter } = setup(awaiting(), {});
    await expect(new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-1", now)).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("renouvellement d'un abonnement expiré : la nouvelle période repart de la date du paiement", async () => {
    const s = awaiting({ status: SubscriptionStatus.EXPIRED });
    const { events, port, emitter } = setup(s, { pro: price("pro", 25_000, "QUARTERLY") });
    await new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-1", d("2027-03-15"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.currentPeriodEnd).toEqual(d("2027-06-15"));
    expect(events.emit.mock.calls[0]?.[0]).toBe("subscription.renewed");
  });

  it("renouvellement en cours de validité : la nouvelle période démarre à l'échéance précédente", async () => {
    const s = awaiting();
    const { port, emitter } = setup(s, { pro: price("pro", 25_000, "YEARLY") });
    await new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-1", now);
    expect(s.currentPeriodEnd).toEqual(d("2027-12-01"));
  });

  it("paiement initial d'un abonnement en attente : activation d'un mois à partir de maintenant", async () => {
    const s = sub({ status: SubscriptionStatus.PENDING_PAYMENT, startedAt: null, currentPeriodEnd: null });
    const { repo, events, port, emitter } = setup(s, { pro: price("pro", 25_000, "MONTHLY") });
    await new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-0", d("2026-11-20"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.currentPeriodEnd).toEqual(d("2026-12-20"));
    expect(repo.save).toHaveBeenCalledWith(s);
    expect(events.emit.mock.calls[0]?.[0]).toBe("subscription.activated");
  });

  it("paiement initial sans prix retrouvé : période mensuelle par défaut, depuis un essai", async () => {
    const s = sub({ status: SubscriptionStatus.TRIALING });
    const { port, emitter } = setup(s, {});
    await new ConfirmSubscriptionPaymentUseCase(port, emitter).execute("sub-1", "pay-0", d("2026-11-20"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.currentPeriodEnd).toEqual(d("2026-12-20"));
  });
});

describe("FailRenewalUseCase (cas limites)", () => {
  const now = d("2026-12-02");
  const pending = (over: Partial<SubscriptionProps> = {}) => {
    const s = sub(over);
    s.markRenewalRequested(25_000, d("2026-12-01"));
    s.attachRenewalPayment("pay-1", null);
    return s;
  };

  it("lève NotFoundDomainError pour un abonnement inconnu", async () => {
    const { port, emitter } = setup(null);
    await expect(new FailRenewalUseCase(port, emitter).execute("x")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("passe en grâce et publie les deux événements historiques avec la même fin de grâce", async () => {
    const s = pending();
    const { repo, events, port, emitter } = setup(s);
    await new FailRenewalUseCase(port, emitter).execute("sub-1", "pay-1", 3, now);
    expect(s.status).toBe(SubscriptionStatus.GRACE_PERIOD);
    expect(repo.save).toHaveBeenCalledWith(s);
    expect(events.emit.mock.calls.map((c) => c[0])).toEqual([
      "subscription.grace-period-started",
      "subscription.entered-grace-period",
    ]);
    const payload = events.emit.mock.calls[0]?.[1] as SubscriptionEnteredGracePeriodEvent;
    expect(payload.graceEndsAt).toEqual(s.graceEndsAt);
    expect(events.emit.mock.calls[1]?.[1]).toBe(payload);
  });

  it("sans identifiant de paiement (création du paiement impossible) : passe en grâce", async () => {
    const s = sub();
    s.markRenewalRequested(25_000, d("2026-12-01"));
    const { port, emitter } = setup(s);
    await new FailRenewalUseCase(port, emitter).execute("sub-1", undefined, undefined, now);
    expect(s.status).toBe(SubscriptionStatus.GRACE_PERIOD);
  });

  it("ignore un paiement qui n'est pas celui de la demande en attente", async () => {
    const s = pending();
    const { repo, events, port, emitter } = setup(s);
    await new FailRenewalUseCase(port, emitter).execute("sub-1", "autre-paiement", 3, now);
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(repo.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("ignore l'échec quand aucune demande n'est en attente", async () => {
    const { repo, port, emitter } = setup(sub());
    await new FailRenewalUseCase(port, emitter).execute("sub-1", undefined, 3, now);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("ignore l'échec d'un abonnement suspendu", async () => {
    const s = pending({ status: SubscriptionStatus.SUSPENDED });
    const { repo, port, emitter } = setup(s);
    await new FailRenewalUseCase(port, emitter).execute("sub-1", "pay-1", 3, now);
    expect(repo.save).not.toHaveBeenCalled();
    expect(s.status).toBe(SubscriptionStatus.SUSPENDED);
  });

  it("en grâce : enregistre l'échec de la relance sans publier ni prolonger la grâce", async () => {
    const s = pending({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: d("2026-12-04") });
    const { repo, events, port, emitter } = setup(s);
    await new FailRenewalUseCase(port, emitter).execute("sub-1", "pay-1", 3, now);
    expect(s.lastRenewalStatus).toBe("FAILED");
    expect(s.graceEndsAt).toEqual(d("2026-12-04"));
    expect(repo.save).toHaveBeenCalledWith(s);
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("Changement de plan : aperçu, annulation, renouvellement automatique", () => {
  const prices = { basic: price("basic", 10_000), pro: price("pro", 25_000), ent: price("ent", 40_000) };

  it("aperçu d'une montée en gamme : prorata exact et date d'effet = maintenant", async () => {
    const now = d("2026-11-16");
    const { port } = setup(sub({ planPriceId: "pro", currentPeriodEnd: d("2026-12-01") }), prices);
    const preview = await new PreviewPlanChangeUseCase(port).execute("tenant-1", "ent", now);
    // période 1er nov -> 1er déc : 30 jours ; 15 jours restants
    expect(preview).toMatchObject({
      newPlanPriceId: "ent",
      direction: "UPGRADE",
      timing: "IMMEDIATE",
      totalDays: 30,
      remainingDays: 15,
      creditAmount: 12_500,
      chargeAmount: 20_000,
      amountDue: 7_500,
      effectiveAt: now,
    });
  });

  it("aperçu d'une descente : effective à l'échéance courante, sans montant dû", async () => {
    const { port } = setup(sub({ planPriceId: "pro" }), prices);
    const preview = await new PreviewPlanChangeUseCase(port).execute("tenant-1", "basic", d("2026-11-16"));
    expect(preview).toMatchObject({ direction: "DOWNGRADE", timing: "AT_PERIOD_END", amountDue: 0, effectiveAt: d("2026-12-01") });
  });

  it("annule une descente planifiée et publie plan-change-canceled", async () => {
    const s = sub();
    s.schedulePlanChange("basic");
    const { repo, events, port, emitter } = setup(s);
    await new CancelPendingPlanChangeUseCase(port, emitter).execute("tenant-1");
    expect(s.pendingPlanPriceId).toBeNull();
    expect(repo.save).toHaveBeenCalledWith(s);
    const [name, payload] = events.emit.mock.calls[0] as [string, PlanChangeCanceledEvent];
    expect(name).toBe("subscription.plan-change-canceled");
    expect(payload).toMatchObject({ subscriptionId: "sub-1", tenantId: "tenant-1" });
  });

  it("refuse l'annulation sans abonnement actif ou sans changement planifié", async () => {
    const none = setup(null);
    await expect(new CancelPendingPlanChangeUseCase(none.port, none.emitter).execute("tenant-1")).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
    const noPending = setup(sub());
    await expect(new CancelPendingPlanChangeUseCase(noPending.port, noPending.emitter).execute("tenant-1")).rejects.toBeInstanceOf(
      NotFoundDomainError,
    );
    expect(noPending.repo.save).not.toHaveBeenCalled();
    expect(noPending.events.emit).not.toHaveBeenCalled();
  });

  it("SetAutoRenew bascule le renouvellement et persiste ; refuse sans abonnement actif", async () => {
    const s = sub();
    const { repo, port } = setup(s);
    await new SetAutoRenewUseCase(port).execute("tenant-1", false);
    expect(s.autoRenew).toBe(false);
    expect(repo.save).toHaveBeenCalledWith(s);
    await expect(new SetAutoRenewUseCase(setup(null).port).execute("tenant-1", true)).rejects.toBeInstanceOf(NotFoundDomainError);
  });
});

describe("Lectures d'abonnement", () => {
  it("GetSubscriptionUsage renvoie l'abonnement actif ou lève NotFoundDomainError", async () => {
    const s = sub();
    await expect(new GetSubscriptionUsageUseCase(setup(s).port).execute("tenant-1")).resolves.toBe(s);
    await expect(new GetSubscriptionUsageUseCase(setup(null).port).execute("tenant-1")).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("CheckTenantOperational : vrai pour un abonnement opérationnel, faux sinon ou sans abonnement", async () => {
    await expect(new CheckTenantOperationalUseCase(setup(sub()).port).execute("t")).resolves.toBe(true);
    await expect(
      new CheckTenantOperationalUseCase(setup(sub({ status: SubscriptionStatus.EXPIRED })).port).execute("t"),
    ).resolves.toBe(false);
    await expect(new CheckTenantOperationalUseCase(setup(null).port).execute("t")).resolves.toBe(false);
  });

  it("GetTenantSubscription délègue à la lecture enrichie du dépôt", async () => {
    const { repo, port } = setup(null);
    const details = { id: "sub-1", planName: "Pro" };
    repo.findLatestForTenantWithPlanDetails.mockResolvedValue(details);
    await expect(new GetTenantSubscriptionUseCase(port).execute("tenant-1")).resolves.toBe(details);
    expect(repo.findLatestForTenantWithPlanDetails).toHaveBeenCalledWith("tenant-1");
  });

  it("ListRenewalsDue interroge le dépôt avec l'échéance now + N jours", async () => {
    const { repo, port } = setup(null);
    const due = [sub()];
    repo.listDueForRenewal.mockResolvedValue(due);
    const now = new Date(2026, 10, 20, 12, 0, 0);
    await expect(new ListRenewalsDueUseCase(port).execute(7, now)).resolves.toBe(due);
    expect(repo.listDueForRenewal).toHaveBeenCalledWith(new Date(2026, 10, 27, 12, 0, 0));
  });
});
