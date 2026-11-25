import { describe, expect, it } from "vitest";

import { describeReplayOutcome, formatAge, reconciliationOverviewSchema } from "./reconciliation.schema";

describe("reconciliationOverviewSchema", () => {
  it("lit une réponse complète et convertit les dates", () => {
    const parsed = reconciliationOverviewSchema.parse({
      stalePendingPayments: [
        { id: "p1", tenantId: "t1", providerCode: "PAYSTACK", providerReference: "r1", method: "ORANGE_MONEY", amount: 25000, currency: "XOF", createdAt: "2026-11-18T10:00:00.000Z" },
      ],
      webhookFailures: [
        { id: "w1", providerCode: "PAYSTACK", outcome: "ERROR", receivedAt: "2026-11-18T10:05:00.000Z", providerReference: null, resolvedAt: null, replayable: false },
      ],
      suspectedDuplicates: [],
    });
    expect(parsed.stalePendingPayments[0]?.createdAt).toBeInstanceOf(Date);
    expect(parsed.webhookFailures[0]?.replayable).toBe(false);
  });

  it("refuse une réponse sans les trois sections", () => {
    expect(reconciliationOverviewSchema.safeParse({ stalePendingPayments: [] }).success).toBe(false);
  });
});

describe("describeReplayOutcome", () => {
  it("distingue traité, déjà traité (idempotent) et toujours inconnu", () => {
    expect(describeReplayOutcome("PROCESSED")).toContain("traité");
    expect(describeReplayOutcome("DUPLICATE")).toContain("idempotent");
    expect(describeReplayOutcome("UNKNOWN_REFERENCE")).toContain("introuvable");
    expect(describeReplayOutcome("???")).toBe("Rejeu terminé.");
  });
});

describe("formatAge", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  it("affiche minutes, heures puis jours", () => {
    expect(formatAge(new Date("2026-11-18T11:30:00Z"), now)).toBe("30 min");
    expect(formatAge(new Date("2026-11-18T07:00:00Z"), now)).toBe("5 h");
    expect(formatAge(new Date("2026-11-15T12:00:00Z"), now)).toBe("3 j");
  });
  it("ne renvoie jamais un âge négatif (horloge décalée)", () => {
    expect(formatAge(new Date("2026-11-18T12:05:00Z"), now)).toBe("0 min");
  });
});
