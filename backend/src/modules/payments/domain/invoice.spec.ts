import { buildInvoiceNumber } from "./invoice";

describe("buildInvoiceNumber", () => {
  it("combine année, mois (UTC) et 8 premiers caractères de l'identifiant", () => {
    const number = buildInvoiceNumber("a1b2c3d4-e5f6-7890-abcd-ef1234567890", new Date("2026-03-09T10:00:00Z"));
    expect(number).toBe("FAC-202603-A1B2C3D4");
  });

  it("est stable pour un même paiement", () => {
    const date = new Date("2026-11-17T00:00:00Z");
    expect(buildInvoiceNumber("x-1", date)).toBe(buildInvoiceNumber("x-1", date));
  });
});
