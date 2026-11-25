import { AUTOMATIC_REFUND_MAX_PROGRESS_PERCENT, evaluateRefundEligibility } from "./refund-eligibility";
import type { RefundEligibilityInput } from "./refund-eligibility";

const REQUESTED_AT = new Date("2026-11-18T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function input(overrides: Partial<RefundEligibilityInput> = {}): RefundEligibilityInput {
  return {
    paidAt: new Date(REQUESTED_AT.getTime() - 2 * DAY),
    requestedAt: REQUESTED_AT,
    completedLessons: 1,
    totalLessons: 10,
    submittedAssessmentAttempts: 0,
    certificateIssued: false,
    ...overrides,
  };
}

describe("evaluateRefundEligibility (section 9.5)", () => {
  it("est éligible quand les quatre critères sont remplis", () => {
    expect(evaluateRefundEligibility(input())).toEqual({
      eligible: true,
      withinWindow: true,
      progressBelowLimit: true,
      noAssessmentSubmitted: true,
      noCertificate: true,
      progressPercent: 10,
    });
  });

  describe("fenêtre de 7 jours", () => {
    it("exactement 7 jours : encore éligible", () => {
      expect(evaluateRefundEligibility(input({ paidAt: new Date(REQUESTED_AT.getTime() - 7 * DAY) })).withinWindow).toBe(true);
    });
    it("7 jours et 1 ms : hors fenêtre, donc non éligible", () => {
      const result = evaluateRefundEligibility(input({ paidAt: new Date(REQUESTED_AT.getTime() - 7 * DAY - 1) }));
      expect(result.withinWindow).toBe(false);
      expect(result.eligible).toBe(false);
    });
  });

  describe("progression < 20 %", () => {
    it("19 % (19 leçons sur 100) : éligible", () => {
      expect(evaluateRefundEligibility(input({ completedLessons: 19, totalLessons: 100 })).progressBelowLimit).toBe(true);
    });
    it("exactement 20 % (2 sur 10) : NON éligible", () => {
      const result = evaluateRefundEligibility(input({ completedLessons: 2, totalLessons: 10 }));
      expect(result.progressBelowLimit).toBe(false);
      expect(result.eligible).toBe(false);
      expect(AUTOMATIC_REFUND_MAX_PROGRESS_PERCENT).toBe(20);
    });
    it("19,9 % (199 sur 1000) reste sous la limite sans erreur d'arrondi, l'affichage est tronqué à 19", () => {
      const result = evaluateRefundEligibility(input({ completedLessons: 199, totalLessons: 1000 }));
      expect(result.progressBelowLimit).toBe(true);
      expect(result.progressPercent).toBe(19);
    });
    it("aucune leçon dans la formation : progression nulle", () => {
      const result = evaluateRefundEligibility(input({ completedLessons: 0, totalLessons: 0 }));
      expect(result).toMatchObject({ progressBelowLimit: true, progressPercent: 0 });
    });
    it("100 % : non éligible", () => {
      expect(evaluateRefundEligibility(input({ completedLessons: 10, totalLessons: 10 })).eligible).toBe(false);
    });
  });

  it("une seule tentative de quiz ou d'examen soumise suffit à refuser", () => {
    const result = evaluateRefundEligibility(input({ submittedAssessmentAttempts: 1 }));
    expect(result).toMatchObject({ noAssessmentSubmitted: false, eligible: false });
  });

  it("un certificat délivré refuse, même avec tous les autres critères remplis", () => {
    const result = evaluateRefundEligibility(input({ certificateIssued: true }));
    expect(result).toMatchObject({ noCertificate: false, eligible: false, withinWindow: true, progressBelowLimit: true });
  });

  it("des données aberrantes (négatifs) ne rendent pas éligible à tort ni ne lèvent d'erreur", () => {
    expect(() => evaluateRefundEligibility(input({ completedLessons: -5, totalLessons: -1 }))).not.toThrow();
    expect(evaluateRefundEligibility(input({ submittedAssessmentAttempts: 2, completedLessons: 50, totalLessons: 100 })).eligible).toBe(false);
  });
});
