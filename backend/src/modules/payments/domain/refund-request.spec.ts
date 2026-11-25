import { InvalidStateTransitionError } from "@shared/errors";

import {
  applyRefundDecision,
  isWithinAutomaticWindow,
  RefundDecisionNoteRequiredError,
} from "./refund-request";

describe("applyRefundDecision", () => {
  it("accepte puis exécute une demande", () => {
    const accepted = applyRefundDecision("REQUESTED", "ACCEPT");
    expect(accepted).toBe("ACCEPTED");
    expect(applyRefundDecision(accepted, "EXECUTE")).toBe("REFUNDED");
  });

  it("refuse une demande avec un motif", () => {
    expect(applyRefundDecision("REQUESTED", "REJECT", "Progression supérieure à 20 %")).toBe("REJECTED");
  });

  it("exige un motif pour un refus", () => {
    expect(() => applyRefundDecision("REQUESTED", "REJECT")).toThrow(RefundDecisionNoteRequiredError);
    expect(() => applyRefundDecision("REQUESTED", "REJECT", "   ")).toThrow(RefundDecisionNoteRequiredError);
  });

  it("n'exécute pas une demande non acceptée et ne rouvre pas une demande close", () => {
    expect(() => applyRefundDecision("REQUESTED", "EXECUTE")).toThrow(InvalidStateTransitionError);
    expect(() => applyRefundDecision("REJECTED", "ACCEPT")).toThrow(InvalidStateTransitionError);
    expect(() => applyRefundDecision("REFUNDED", "EXECUTE")).toThrow(InvalidStateTransitionError);
  });
});

describe("isWithinAutomaticWindow", () => {
  const paidAt = new Date("2026-11-01T00:00:00Z");

  it("est vrai jusqu'à 7 jours après le paiement", () => {
    expect(isWithinAutomaticWindow(paidAt, new Date("2026-11-08T00:00:00Z"))).toBe(true);
  });

  it("est faux au-delà", () => {
    expect(isWithinAutomaticWindow(paidAt, new Date("2026-11-08T00:00:01Z"))).toBe(false);
  });
});
