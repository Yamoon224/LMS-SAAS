import { InvalidStateTransitionError } from "@shared/errors";

import { Payout } from "./payout.entity";
import type { PayoutProps } from "./payout.entity";
import { canTransitionPayoutStatus, PayoutStatus } from "./payout-status";

function build(status: PayoutStatus, overrides: Partial<PayoutProps> = {}): Payout {
  return Payout.fromPersistence({
    id: "payout-1",
    tenantId: "tenant-1",
    amount: 150_000,
    currency: "XOF",
    status,
    destination: { type: "MOBILE_MONEY", accountNumber: "0700000000", accountName: "Acme SARL" },
    validatedByUserId: null,
    approvedByUserId: null,
    proofUrl: null,
    rejectionReason: null,
    ...overrides,
  });
}

describe("Payout - accesseurs", () => {
  it("expose les données et des dates nulles par défaut", () => {
    const payout = build(PayoutStatus.REQUESTED);
    expect(payout.id).toBe("payout-1");
    expect(payout.tenantId).toBe("tenant-1");
    expect(payout.amount).toBe(150_000);
    expect(payout.currency).toBe("XOF");
    expect(payout.status).toBe(PayoutStatus.REQUESTED);
    expect(payout.destination).toEqual({ type: "MOBILE_MONEY", accountNumber: "0700000000", accountName: "Acme SARL" });
    expect(payout.requestedAt).toBeNull();
    expect(payout.executedAt).toBeNull();
  });

  it("expose la date de demande et d'exécution quand elles sont connues", () => {
    const requestedAt = new Date("2026-11-01T00:00:00Z");
    const executedAt = new Date("2026-11-05T00:00:00Z");
    const payout = build(PayoutStatus.EXECUTED, { requestedAt, executedAt });
    expect(payout.requestedAt).toBe(requestedAt);
    expect(payout.executedAt).toBe(executedAt);
  });
});

describe("Payout - double validation (ADM-24)", () => {
  it("suit le circuit REQUESTED -> VALIDATED -> APPROVED -> EXECUTED et conserve preuve et dates", () => {
    const payout = build(PayoutStatus.REQUESTED);
    payout.validate("operator-1");
    expect(payout.status).toBe(PayoutStatus.VALIDATED);
    payout.approve("finance-1");
    expect(payout.status).toBe(PayoutStatus.APPROVED);
    payout.execute("https://proof/1.pdf");
    expect(payout.status).toBe(PayoutStatus.EXECUTED);
    expect(payout.executedAt).toBeInstanceOf(Date);
    expect(payout.toSnapshot()).toMatchObject({
      validatedByUserId: "operator-1",
      approvedByUserId: "finance-1",
      proofUrl: "https://proof/1.pdf",
    });
  });

  it("refuse que la même personne valide puis approuve (quatre yeux)", () => {
    const payout = build(PayoutStatus.REQUESTED);
    payout.validate("user-1");
    expect(() => payout.approve("user-1")).toThrow(InvalidStateTransitionError);
    expect(payout.status).toBe(PayoutStatus.VALIDATED);
    expect(payout.toSnapshot().approvedByUserId).toBeNull();
  });

  it("refuse d'approuver ou d'exécuter en sautant une étape", () => {
    expect(() => build(PayoutStatus.REQUESTED).approve("finance-1")).toThrow(InvalidStateTransitionError);
    expect(() => build(PayoutStatus.REQUESTED).execute("p")).toThrow(InvalidStateTransitionError);
    expect(() => build(PayoutStatus.VALIDATED).execute("p")).toThrow(InvalidStateTransitionError);
  });

  it("refuse toute transition depuis un statut terminal", () => {
    expect(() => build(PayoutStatus.EXECUTED).reject("trop tard")).toThrow(InvalidStateTransitionError);
    expect(() => build(PayoutStatus.REJECTED).validate("op")).toThrow(InvalidStateTransitionError);
  });

  it.each([PayoutStatus.REQUESTED, PayoutStatus.VALIDATED, PayoutStatus.APPROVED])(
    "peut être rejeté depuis %s avec le motif conservé",
    (status) => {
      const payout = build(status);
      payout.reject("IBAN invalide");
      expect(payout.status).toBe(PayoutStatus.REJECTED);
      expect(payout.toSnapshot().rejectionReason).toBe("IBAN invalide");
    },
  );

  it("toSnapshot renvoie une copie, pas l'état interne", () => {
    const payout = build(PayoutStatus.REQUESTED);
    const snapshot = payout.toSnapshot() as PayoutProps;
    snapshot.amount = 1;
    expect(payout.amount).toBe(150_000);
  });
});

describe("canTransitionPayoutStatus", () => {
  it("n'autorise que les transitions du cycle de vie", () => {
    expect(canTransitionPayoutStatus(PayoutStatus.REQUESTED, PayoutStatus.VALIDATED)).toBe(true);
    expect(canTransitionPayoutStatus(PayoutStatus.APPROVED, PayoutStatus.EXECUTED)).toBe(true);
    expect(canTransitionPayoutStatus(PayoutStatus.APPROVED, PayoutStatus.REQUESTED)).toBe(false);
    expect(canTransitionPayoutStatus(PayoutStatus.EXECUTED, PayoutStatus.REJECTED)).toBe(false);
  });
});
