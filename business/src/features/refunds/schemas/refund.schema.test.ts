import { describe, expect, it } from "vitest";

import { eligibilityCriteria, parseAcceptedAmount, refundRequestSchema } from "./refund.schema";

describe("parseAcceptedAmount", () => {
  it("vide = remboursement intégral (aucun montant envoyé)", () => {
    expect(parseAcceptedAmount("", 25000)).toEqual({ ok: true, amount: undefined });
    expect(parseAcceptedAmount("   ", 25000)).toEqual({ ok: true, amount: undefined });
  });

  it("un montant égal au maximum reste un remboursement intégral", () => {
    expect(parseAcceptedAmount("25000", 25000)).toEqual({ ok: true, amount: undefined });
  });

  it("un montant inférieur est un remboursement partiel", () => {
    expect(parseAcceptedAmount("10000", 25000)).toEqual({ ok: true, amount: 10000 });
  });

  it("tolère les séparateurs de milliers (espace, insécable, fine insécable)", () => {
    expect(parseAcceptedAmount("10 000", 25000)).toEqual({ ok: true, amount: 10000 });
    expect(parseAcceptedAmount("10 000", 25000)).toEqual({ ok: true, amount: 10000 });
    expect(parseAcceptedAmount("10 000", 25000)).toEqual({ ok: true, amount: 10000 });
  });

  it.each(["abc", "12.5", "12,5", "-5", "1e3"])("refuse %s", (text) => {
    expect(parseAcceptedAmount(text, 25000).ok).toBe(false);
  });

  it("refuse zéro et un montant supérieur au paiement", () => {
    expect(parseAcceptedAmount("0", 25000)).toMatchObject({ ok: false });
    expect(parseAcceptedAmount("25001", 25000)).toMatchObject({ ok: false });
  });
});

describe("eligibilityCriteria", () => {
  it("liste les quatre critères de la politique avec leur état", () => {
    const criteria = eligibilityCriteria({
      eligible: false,
      withinWindow: true,
      progressBelowLimit: false,
      noAssessmentSubmitted: true,
      noCertificate: false,
      progressPercent: 20,
    });
    expect(criteria.map((c) => c.met)).toEqual([true, false, true, false]);
    expect(criteria[1]?.label).toContain("20 %");
  });
});

describe("refundRequestSchema — étape 30", () => {
  const base = {
    id: "r1",
    amount: 25000,
    currency: "XOF",
    reason: null,
    decisionNote: null,
    status: "ACCEPTED",
    requestedAt: "2026-11-18T10:00:00.000Z",
    resolvedAt: null,
    courseTitle: "Excel",
    learnerName: "Awa",
    learnerEmail: "awa@example.com",
    withinAutomaticWindow: true,
  };

  it("accepte une ancienne demande sans critères (compatibilité)", () => {
    const parsed = refundRequestSchema.parse(base);
    expect(parsed.eligibility ?? null).toBeNull();
    expect(parsed.autoAccepted).toBe(false);
  });

  it("lit une demande acceptée automatiquement avec ses critères", () => {
    const parsed = refundRequestSchema.parse({
      ...base,
      autoAccepted: true,
      eligibility: { eligible: true, withinWindow: true, progressBelowLimit: true, noAssessmentSubmitted: true, noCertificate: true, progressPercent: 0 },
    });
    expect(parsed.autoAccepted).toBe(true);
    expect(parsed.eligibility?.eligible).toBe(true);
  });
});
