import { InvalidStateTransitionError } from "@shared/errors";

import { SubscriptionStatus } from "./subscription-status";
import { Subscription, RENEWAL_RETRY_INTERVAL_HOURS } from "./subscription.entity";
import type { SubscriptionProps } from "./subscription.entity";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const HOUR = 3_600_000;

function build(overrides: Partial<SubscriptionProps> = {}): Subscription {
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

describe("Subscription - valeurs par défaut de fromPersistence", () => {
  it("normalise les champs optionnels absents", () => {
    const s = build();
    expect(s.pendingPlanPriceId).toBeNull();
    expect(s.pendingChangeAt).toBeNull();
    expect(s.renewalForPeriodEnd).toBeNull();
    expect(s.lastRenewalStatus).toBeNull();
    expect(s.lastRenewalAt).toBeNull();
    expect(s.lastRenewalPaymentId).toBeNull();
    expect(s.lastRenewalCheckoutUrl).toBeNull();
    expect(s.lastRenewalAmount).toBeNull();
    expect(s.isComplimentary).toBe(false);
    expect(s.discountPeriodsRemaining).toBeNull();
    expect(s.activeDiscount()).toBeNull();
    expect(s.canceledAt).toBeNull();
    expect(s.id).toBe("sub-1");
    expect(s.tenantId).toBe("tenant-1");
    expect(s.planPriceId).toBe("pro");
    expect(s.autoRenew).toBe(true);
    expect(s.startedAt).toEqual(d("2026-10-01"));
    expect(s.currentPeriodEnd).toEqual(d("2026-12-01"));
    expect(s.graceEndsAt).toBeNull();
  });
});

describe("Subscription - remise Admin (ADM-09)", () => {
  it("pose une remise en pourcentage et l'expose comme remise active", () => {
    const s = build();
    s.applyDiscount({ percent: 20 }, 3);
    expect(s.activeDiscount()).toEqual({ percent: 20, amount: null, periodsRemaining: 3 });
    expect(s.discountPeriodsRemaining).toBe(3);
  });

  it("pose une remise en montant fixe", () => {
    const s = build();
    s.applyDiscount({ amount: 5000 }, 1);
    expect(s.activeDiscount()).toEqual({ percent: null, amount: 5000, periodsRemaining: 1 });
  });

  it("remplace la remise précédente (le montant n'est pas conservé)", () => {
    const s = build();
    s.applyDiscount({ amount: 5000 }, 2);
    s.applyDiscount({ percent: 10 }, 4);
    expect(s.activeDiscount()).toEqual({ percent: 10, amount: null, periodsRemaining: 4 });
  });

  it.each([
    ["ni pourcentage ni montant", {}, 1],
    ["pourcentage et montant", { percent: 10, amount: 100 }, 1],
    ["durée nulle", { percent: 10 }, 0],
    ["durée non entière", { percent: 10 }, 1.5],
    ["pourcentage nul", { percent: 0 }, 1],
    ["pourcentage supérieur à 100", { percent: 101 }, 1],
    ["pourcentage non entier", { percent: 10.5 }, 1],
    ["montant nul", { amount: 0 }, 1],
    ["montant non entier", { amount: 10.5 }, 1],
  ])("refuse: %s", (_label, discount, periods) => {
    const s = build();
    expect(() => s.applyDiscount(discount, periods)).toThrow(InvalidStateTransitionError);
    expect(s.activeDiscount()).toBeNull();
  });

  it("accepte 100 % comme borne", () => {
    const s = build();
    s.applyDiscount({ percent: 100 }, 1);
    expect(s.activeDiscount()?.percent).toBe(100);
  });

  it("clearDiscount retire toute remise", () => {
    const s = build({ discountPercent: 10, discountPeriodsRemaining: 2 });
    expect(s.activeDiscount()).not.toBeNull();
    s.clearDiscount();
    expect(s.activeDiscount()).toBeNull();
    expect(s.toSnapshot().discountPercent).toBeNull();
  });

  it("n'expose aucune remise quand les périodes sont épuisées ou sans valeur", () => {
    expect(build({ discountPercent: 10, discountPeriodsRemaining: 0 }).activeDiscount()).toBeNull();
    expect(build({ discountPeriodsRemaining: 2 }).activeDiscount()).toBeNull();
  });
});

describe("Subscription - prolongation Admin", () => {
  it("prolonge un abonnement ACTIVE", () => {
    const s = build();
    s.extendPeriod(d("2027-01-01"));
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it("prolonge un abonnement TRIALING", () => {
    const s = build({ status: SubscriptionStatus.TRIALING });
    s.extendPeriod(d("2027-01-01"));
    expect(s.status).toBe(SubscriptionStatus.TRIALING);
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
  });

  it("réactive depuis la grâce et efface la fin de grâce", () => {
    const s = build({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: d("2026-12-04") });
    s.extendPeriod(d("2027-01-01"));
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.graceEndsAt).toBeNull();
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
  });

  it("refuse une fin égale ou antérieure à l'échéance actuelle", () => {
    const s = build();
    expect(() => s.extendPeriod(d("2026-12-01"))).toThrow(InvalidStateTransitionError);
    expect(() => s.extendPeriod(d("2026-11-01"))).toThrow(InvalidStateTransitionError);
    expect(s.currentPeriodEnd).toEqual(d("2026-12-01"));
  });

  it.each([SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELED, SubscriptionStatus.SUSPENDED, SubscriptionStatus.PENDING_PAYMENT])(
    "refuse la prolongation d'un abonnement %s",
    (status) => {
      expect(() => build({ status }).extendPeriod(d("2027-01-01"))).toThrow(InvalidStateTransitionError);
    },
  );

  it("accepte n'importe quelle date quand aucune échéance n'existe", () => {
    const s = build({ currentPeriodEnd: null });
    s.extendPeriod(d("2027-01-01"));
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
  });
});

describe("Subscription - plan offert", () => {
  it("passe ACTIVE sans renouvellement automatique et efface remise et descente planifiée", () => {
    const s = build({
      status: SubscriptionStatus.EXPIRED,
      startedAt: null,
      pendingPlanPriceId: "basic",
      pendingChangeAt: d("2026-12-01"),
      discountPercent: 10,
      discountPeriodsRemaining: 2,
      graceEndsAt: d("2026-12-04"),
    });
    const now = d("2026-11-20");
    s.grantComplimentary("gift", d("2027-02-01"), now);
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.planPriceId).toBe("gift");
    expect(s.currentPeriodEnd).toEqual(d("2027-02-01"));
    expect(s.startedAt).toEqual(now);
    expect(s.autoRenew).toBe(false);
    expect(s.isComplimentary).toBe(true);
    expect(s.pendingPlanPriceId).toBeNull();
    expect(s.pendingChangeAt).toBeNull();
    expect(s.graceEndsAt).toBeNull();
    expect(s.activeDiscount()).toBeNull();
  });

  it("conserve la date de démarrage d'un abonnement déjà ACTIVE", () => {
    const s = build();
    s.grantComplimentary("gift", d("2027-02-01"), d("2026-11-20"));
    expect(s.startedAt).toEqual(d("2026-10-01"));
  });

  it("refuse la transition depuis un statut non autorisé (CANCELED)", () => {
    const s = build({ status: SubscriptionStatus.CANCELED });
    expect(() => s.grantComplimentary("gift", d("2027-02-01"), d("2026-11-20"))).toThrow(InvalidStateTransitionError);
  });
});

describe("Subscription - cycle de vie complémentaire", () => {
  it("startTrial passe en TRIALING avec l'échéance d'essai", () => {
    const s = build({ status: SubscriptionStatus.PENDING_PAYMENT, startedAt: null, currentPeriodEnd: null });
    s.startTrial(d("2026-12-01"));
    expect(s.status).toBe(SubscriptionStatus.TRIALING);
    expect(s.currentPeriodEnd).toEqual(d("2026-12-01"));
    expect(s.startedAt).not.toBeNull();
  });

  it("startTrial est refusé depuis ACTIVE", () => {
    expect(() => build().startTrial(d("2026-12-01"))).toThrow(InvalidStateTransitionError);
  });

  it("enterGracePeriod utilise la durée et la date fournies", () => {
    const s = build();
    const now = new Date("2026-12-01T10:00:00.000Z");
    const { graceEndsAt } = s.enterGracePeriod(5, now);
    expect(Math.round((graceEndsAt.getTime() - now.getTime()) / HOUR / 24)).toBe(5);
    expect(s.graceEndsAt).toBe(graceEndsAt);
  });

  it("hasGracePeriodElapsed est faux hors grâce ou sans date de fin", () => {
    expect(build().hasGracePeriodElapsed()).toBe(false);
    expect(build({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: null }).hasGracePeriodElapsed()).toBe(false);
  });

  it("suspend passe en SUSPENDED", () => {
    const s = build();
    s.suspend();
    expect(s.status).toBe(SubscriptionStatus.SUSPENDED);
  });

  it("cancelAtPeriodEnd désactive le renouvellement et horodate", () => {
    const s = build();
    s.cancelAtPeriodEnd();
    expect(s.status).toBe(SubscriptionStatus.CANCELED);
    expect(s.autoRenew).toBe(false);
    expect(s.canceledAt).toBeInstanceOf(Date);
  });

  it("activate conserve le startedAt existant et efface la fin de grâce", () => {
    const s = build({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: d("2026-12-04") });
    s.activate(d("2027-01-01"));
    expect(s.startedAt).toEqual(d("2026-10-01"));
    expect(s.graceEndsAt).toBeNull();
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
  });

  it("setAutoRenew bascule le renouvellement automatique", () => {
    const s = build();
    s.setAutoRenew(false);
    expect(s.autoRenew).toBe(false);
  });
});

describe("Subscription - changement de plan planifié", () => {
  it("planifie une descente à l'échéance courante et nextPlanPriceId la renvoie", () => {
    const s = build();
    s.schedulePlanChange("basic");
    expect(s.pendingPlanPriceId).toBe("basic");
    expect(s.pendingChangeAt).toEqual(d("2026-12-01"));
    expect(s.nextPlanPriceId()).toBe("basic");
    expect(s.planPriceId).toBe("pro");
  });

  it("refuse de planifier sans échéance courante", () => {
    const s = build({ currentPeriodEnd: null });
    expect(() => s.schedulePlanChange("basic")).toThrow(InvalidStateTransitionError);
  });

  it("changePlanPrice applique le prix et efface la planification", () => {
    const s = build();
    s.schedulePlanChange("basic");
    s.changePlanPrice("enterprise");
    expect(s.planPriceId).toBe("enterprise");
    expect(s.pendingPlanPriceId).toBeNull();
    expect(s.nextPlanPriceId()).toBe("enterprise");
  });

  it("cancelPendingPlanChange renvoie true puis false", () => {
    const s = build();
    s.schedulePlanChange("basic");
    expect(s.cancelPendingPlanChange()).toBe(true);
    expect(s.cancelPendingPlanChange()).toBe(false);
    expect(s.pendingChangeAt).toBeNull();
  });
});

describe("Subscription - canStartRenewal", () => {
  const now = d("2026-12-02");

  it("est vrai pour un ACTIVE échu avec renouvellement automatique", () => {
    expect(build().canStartRenewal(now)).toBe(true);
  });

  it("est faux avant l'échéance", () => {
    expect(build().canStartRenewal(d("2026-11-30"))).toBe(false);
  });

  it("est faux sans renouvellement automatique ou sans échéance", () => {
    expect(build({ autoRenew: false }).canStartRenewal(now)).toBe(false);
    expect(build({ currentPeriodEnd: null }).canStartRenewal(now)).toBe(false);
  });

  it("est faux quand une demande existe déjà pour cette échéance", () => {
    expect(build({ renewalForPeriodEnd: d("2026-12-01") }).canStartRenewal(now)).toBe(false);
  });

  it("est vrai quand la demande précédente concernait une autre échéance", () => {
    expect(build({ renewalForPeriodEnd: d("2026-11-01") }).canStartRenewal(now)).toBe(true);
  });

  it("est faux pour les statuts hors ACTIVE/GRACE_PERIOD", () => {
    expect(build({ status: SubscriptionStatus.EXPIRED }).canStartRenewal(now)).toBe(false);
    expect(build({ status: SubscriptionStatus.SUSPENDED }).canStartRenewal(now)).toBe(false);
  });

  describe("en période de grâce", () => {
    const failedAt = d("2026-12-02");
    const grace = (over: Partial<SubscriptionProps> = {}) =>
      build({
        status: SubscriptionStatus.GRACE_PERIOD,
        graceEndsAt: d("2026-12-10"),
        lastRenewalStatus: "FAILED",
        lastRenewalAt: failedAt,
        ...over,
      });
    const retryAt = new Date(failedAt.getTime() + RENEWAL_RETRY_INTERVAL_HOURS * HOUR);

    it("est faux moins de 24 h après l'échec, vrai à 24 h pile", () => {
      expect(grace().canStartRenewal(new Date(retryAt.getTime() - 1))).toBe(false);
      expect(grace().canStartRenewal(retryAt)).toBe(true);
    });

    it("est faux si la dernière demande n'a pas échoué ou sans date", () => {
      expect(grace({ lastRenewalStatus: "PENDING" }).canStartRenewal(retryAt)).toBe(false);
      expect(grace({ lastRenewalAt: null }).canStartRenewal(retryAt)).toBe(false);
    });

    it("est faux une fois la grâce terminée, vrai sans fin de grâce", () => {
      expect(grace().canStartRenewal(d("2026-12-11"))).toBe(false);
      expect(grace({ graceEndsAt: null }).canStartRenewal(d("2026-12-11"))).toBe(true);
    });
  });
});

describe("Subscription - suivi du renouvellement", () => {
  it("markRenewalRequested réserve l'échéance courante avec le montant dû", () => {
    const s = build({ lastRenewalPaymentId: "old", lastRenewalCheckoutUrl: "https://old" });
    const now = d("2026-12-02");
    s.markRenewalRequested(22_500, now);
    expect(s.renewalForPeriodEnd).toEqual(d("2026-12-01"));
    expect(s.lastRenewalStatus).toBe("PENDING");
    expect(s.lastRenewalAt).toEqual(now);
    expect(s.lastRenewalAmount).toBe(22_500);
    expect(s.lastRenewalPaymentId).toBeNull();
    expect(s.lastRenewalCheckoutUrl).toBeNull();
  });

  it("attachRenewalPayment n'est reconnu que pour une demande PENDING du même paiement", () => {
    const s = build();
    s.markRenewalRequested(1000, d("2026-12-02"));
    s.attachRenewalPayment("pay-1", "https://pay/1");
    expect(s.lastRenewalPaymentId).toBe("pay-1");
    expect(s.lastRenewalCheckoutUrl).toBe("https://pay/1");
    expect(s.isAwaitingRenewalPayment("pay-1")).toBe(true);
    expect(s.isAwaitingRenewalPayment("pay-2")).toBe(false);
  });

  it("completeRenewal prolonge, applique la descente planifiée et décompte la remise", () => {
    const s = build({
      status: SubscriptionStatus.GRACE_PERIOD,
      graceEndsAt: d("2026-12-04"),
      pendingPlanPriceId: "basic",
      pendingChangeAt: d("2026-12-01"),
      isComplimentary: true,
      discountPercent: 10,
      discountPeriodsRemaining: 3,
    });
    const now = d("2026-12-02");
    s.completeRenewal(d("2027-01-01"), now);
    expect(s.status).toBe(SubscriptionStatus.ACTIVE);
    expect(s.planPriceId).toBe("basic");
    expect(s.pendingPlanPriceId).toBeNull();
    expect(s.currentPeriodEnd).toEqual(d("2027-01-01"));
    expect(s.graceEndsAt).toBeNull();
    expect(s.lastRenewalStatus).toBe("SUCCEEDED");
    expect(s.lastRenewalAt).toEqual(now);
    expect(s.isComplimentary).toBe(false);
    expect(s.discountPeriodsRemaining).toBe(2);
  });

  it("completeRenewal efface la remise à sa dernière période", () => {
    const s = build({ discountAmount: 2000, discountPeriodsRemaining: 1 });
    s.completeRenewal(d("2027-01-01"), d("2026-12-02"));
    expect(s.activeDiscount()).toBeNull();
    expect(s.discountPeriodsRemaining).toBeNull();
  });

  it("completeRenewal est refusé depuis CANCELED (transition invalide)", () => {
    expect(() => build({ status: SubscriptionStatus.CANCELED }).completeRenewal(d("2027-01-01"), d("2026-12-02"))).toThrow(
      InvalidStateTransitionError,
    );
  });

  it("failRenewal passe en grâce depuis ACTIVE et renvoie la fin de grâce", () => {
    const s = build();
    s.markRenewalRequested(1000, d("2026-12-02"));
    const now = new Date("2026-12-02T08:00:00.000Z");
    const grace = s.failRenewal(now, 2);
    expect(grace).not.toBeNull();
    expect(Math.round(((grace?.graceEndsAt.getTime() ?? 0) - now.getTime()) / HOUR / 24)).toBe(2);
    expect(s.status).toBe(SubscriptionStatus.GRACE_PERIOD);
    expect(s.lastRenewalStatus).toBe("FAILED");
    expect(s.lastRenewalAt).toEqual(now);
    expect(s.lastRenewalCheckoutUrl).toBeNull();
  });

  it("failRenewal en grâce met à jour l'échec sans nouvelle grâce", () => {
    const s = build({ status: SubscriptionStatus.GRACE_PERIOD, graceEndsAt: d("2026-12-04") });
    expect(s.failRenewal(d("2026-12-03"))).toBeNull();
    expect(s.graceEndsAt).toEqual(d("2026-12-04"));
    expect(s.lastRenewalStatus).toBe("FAILED");
  });
});
