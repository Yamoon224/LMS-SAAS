import { describe, expect, it } from "vitest";

import { WIZARD_DEFAULTS, wizardSchema } from "./wizard.schema";

const valid = { ...WIZARD_DEFAULTS, name: "Acme Formation", slug: "acme", owner: { ...WIZARD_DEFAULTS.owner, email: "o@acme.com", firstName: "Aya", lastName: "Kone" } };

describe("wizardSchema", () => {
  it("accepte une entreprise minimale (champs facultatifs vides)", () => {
    expect(wizardSchema.safeParse(valid).success).toBe(true);
  });

  it("accepte des commissions décimales, ou vides pour garder la règle globale", () => {
    expect(wizardSchema.safeParse({ ...valid, onlineCommission: "7.5", offlineCommission: "" }).success).toBe(true);
  });

  it.each(["abc", "101", "-3", "12.345"])("refuse la commission %s", (commission) => {
    expect(wizardSchema.safeParse({ ...valid, onlineCommission: commission }).success).toBe(false);
  });

  it("refuse un logo qui n'est pas en https et une couleur mal formée", () => {
    expect(wizardSchema.safeParse({ ...valid, logoUrl: "http://x.com/l.png" }).success).toBe(false);
    expect(wizardSchema.safeParse({ ...valid, primaryColor: "rouge" }).success).toBe(false);
    expect(wizardSchema.safeParse({ ...valid, logoUrl: "https://x.com/l.png", primaryColor: "#0F766E" }).success).toBe(true);
  });

  it("refuse deux mots de passe différents", () => {
    const result = wizardSchema.safeParse({ ...valid, owner: { ...valid.owner, password: "motdepasse1", confirmPassword: "autre" } });
    expect(result.success).toBe(false);
  });

  it("refuse un slug invalide", () => {
    expect(wizardSchema.safeParse({ ...valid, slug: "Acme Corp" }).success).toBe(false);
  });
});
