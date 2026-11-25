import { describe, expect, it } from "vitest";

import {
  canRejectOfflinePayment,
  manualEnrollmentSchema,
  rejectOfflinePaymentSchema,
  toManualEnrollmentBody,
} from "./enrollment.schema";

describe("rejectOfflinePaymentSchema (ENT-61)", () => {
  it("exige un motif non vide", () => {
    expect(rejectOfflinePaymentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(rejectOfflinePaymentSchema.safeParse({ reason: "    " }).success).toBe(false);
    expect(rejectOfflinePaymentSchema.safeParse({}).success).toBe(false);
  });

  it("accepte un motif, borné à 500 caractères, et le rogne", () => {
    expect(rejectOfflinePaymentSchema.parse({ reason: "  Virement non reçu " }).reason).toBe("Virement non reçu");
    expect(rejectOfflinePaymentSchema.safeParse({ reason: "x".repeat(500) }).success).toBe(true);
    expect(rejectOfflinePaymentSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(false);
  });

  it("ne propose le refus que pour une validation hors plateforme en attente", () => {
    expect(canRejectOfflinePayment("PENDING_VALIDATION")).toBe(true);
    for (const status of ["PENDING_PAYMENT", "ACTIVE", "REFUSED", "COMPLETED", "SUSPENDED", "EXPIRED"] as const) {
      expect(canRejectOfflinePayment(status)).toBe(false);
    }
  });
});

describe("manualEnrollmentSchema (ENT-62)", () => {
  const valid = { email: "  AYA@Exemple.com ", firstName: "", lastName: "", reason: "Partenariat" };

  it("normalise l'e-mail et accepte les noms vides (apprenant connu)", () => {
    const parsed = manualEnrollmentSchema.parse(valid);
    expect(parsed.email).toBe("aya@exemple.com");
    expect(toManualEnrollmentBody("c1", parsed)).toEqual({ courseId: "c1", email: "aya@exemple.com", reason: "Partenariat" });
  });

  it("envoie les noms quand ils sont fournis (invitation)", () => {
    const parsed = manualEnrollmentSchema.parse({ ...valid, firstName: "Aya", lastName: "Koné" });
    expect(toManualEnrollmentBody("c1", parsed)).toMatchObject({ firstName: "Aya", lastName: "Koné" });
  });

  it.each([
    { ...valid, email: "pas-un-email" },
    { ...valid, reason: "" },
    { ...valid, reason: "   " },
    { ...valid, reason: "x".repeat(501) },
    { ...valid, firstName: "x".repeat(101) },
  ])("refuse %j", (input) => {
    expect(manualEnrollmentSchema.safeParse(input).success).toBe(false);
  });
});
