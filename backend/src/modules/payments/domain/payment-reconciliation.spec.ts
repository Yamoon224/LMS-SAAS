import {
  classifyPendingPayment,
  DUPLICATE_WINDOW_MS,
  findSuspectedDuplicates,
  isPendingExpired,
  PENDING_EXPIRY_MS,
  PENDING_POLL_MIN_AGE_MS,
} from "./payment-reconciliation";
import type { DuplicateCandidate } from "./payment-reconciliation";

const NOW = new Date("2026-11-18T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("sondage et expiration des paiements en attente", () => {
  it("un paiement de moins de 2 minutes n'est pas encore interrogé ; à 2 minutes pile il l'est", () => {
    expect(classifyPendingPayment(ago(PENDING_POLL_MIN_AGE_MS - 1), NOW)).toBe("WAIT");
    expect(classifyPendingPayment(ago(PENDING_POLL_MIN_AGE_MS), NOW)).toBe("POLL");
  });

  it("expire à 30 minutes, pas avant", () => {
    expect(isPendingExpired(ago(PENDING_EXPIRY_MS - 1), NOW)).toBe(false);
    expect(isPendingExpired(ago(PENDING_EXPIRY_MS), NOW)).toBe(true);
  });
});

function payment(id: string, minutesAgo: number, overrides: Partial<DuplicateCandidate> = {}): DuplicateCandidate {
  return {
    paymentId: id,
    tenantId: "t1",
    amount: 25000,
    currency: "XOF",
    userId: "u1",
    courseId: "c1",
    createdAt: ago(minutesAgo * 60_000),
    ...overrides,
  };
}

describe("findSuspectedDuplicates", () => {
  it("signale un doublon réel : même entreprise, apprenant, formation et montant à 3 minutes d'écart", () => {
    const groups = findSuspectedDuplicates([payment("a", 10), payment("b", 7)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.original.paymentId).toBe("a");
    expect(groups[0]?.duplicates.map((d) => d.paymentId)).toEqual(["b"]);
  });

  it("le premier paiement est l'original, même si la liste arrive dans le désordre", () => {
    const groups = findSuspectedDuplicates([payment("b", 7), payment("a", 10)]);
    expect(groups[0]?.original.paymentId).toBe("a");
  });

  it("exactement 10 minutes d'écart : encore suspect ; au-delà : achats distincts", () => {
    expect(findSuspectedDuplicates([payment("a", 20), payment("b", 10)])).toHaveLength(1);
    expect(findSuspectedDuplicates([payment("a", 21), payment("b", 10)])).toHaveLength(0);
    expect(DUPLICATE_WINDOW_MS).toBe(600_000);
  });

  it.each([
    ["un autre montant", { amount: 30000 }],
    ["une autre formation", { courseId: "c2" }],
    ["un autre apprenant", { userId: "u2" }],
    ["une autre entreprise", { tenantId: "t2" }],
    ["une autre devise", { currency: "EUR" }],
  ])("ne confond pas avec un achat légitime distinct (%s)", (_label, override) => {
    expect(findSuspectedDuplicates([payment("a", 10), payment("b", 9, override)])).toHaveLength(0);
  });

  it("regroupe trois paiements en chaîne : un original, deux doublons", () => {
    const groups = findSuspectedDuplicates([payment("a", 20), payment("b", 14), payment("c", 8)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.duplicates.map((d) => d.paymentId)).toEqual(["b", "c"]);
  });

  it("une liste vide ou un paiement isolé ne donne aucun groupe", () => {
    expect(findSuspectedDuplicates([])).toEqual([]);
    expect(findSuspectedDuplicates([payment("a", 5)])).toEqual([]);
  });
});
