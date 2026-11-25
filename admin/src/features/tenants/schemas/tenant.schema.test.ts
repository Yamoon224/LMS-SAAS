import { describe, expect, it } from "vitest";

import { createTenantSchema, suspendTenantSchema, toCreateTenantPayload } from "./tenant.schema";

const valid = {
  name: "Acme Formation",
  slug: "acme",
  country: "CI",
  currency: "XOF",
  defaultLocale: "fr",
  owner: { email: "owner@acme.test", firstName: "Awa", lastName: "Koné", password: "", confirmPassword: "" },
};

function messages(input: unknown): string[] {
  const result = createTenantSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("createTenantSchema", () => {
  it("accepte une entreprise sans mot de passe (lien d'activation)", () => {
    expect(createTenantSchema.safeParse(valid).success).toBe(true);
    const { password: _p, confirmPassword: _c, ...owner } = valid.owner;
    expect(createTenantSchema.safeParse({ ...valid, owner }).success).toBe(true);
  });

  it("exige 8 caractères minimum si un mot de passe est saisi", () => {
    const owner = { ...valid.owner, password: "court", confirmPassword: "court" };
    expect(messages({ ...valid, owner })).toContain("Le mot de passe doit contenir au moins 8 caractères.");
  });

  it("exige une confirmation identique", () => {
    const owner = { ...valid.owner, password: "ChangeMe123!", confirmPassword: "Autre123!!" };
    const result = createTenantSchema.safeParse({ ...valid, owner });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.message.includes("ne correspondent pas"))?.path).toEqual([
        "owner",
        "confirmPassword",
      ]);
    }
  });

  it("accepte un mot de passe valide confirmé", () => {
    const owner = { ...valid.owner, password: "ChangeMe123!", confirmPassword: "ChangeMe123!" };
    expect(createTenantSchema.safeParse({ ...valid, owner }).success).toBe(true);
  });

  it("valide slug, pays, devise et e-mail", () => {
    expect(messages({ ...valid, slug: "Acme Corp" })).toContain("Minuscules, chiffres et tirets uniquement.");
    expect(messages({ ...valid, country: "CIV" })).toContain("Code pays ISO sur 2 lettres (ex. CI).");
    expect(messages({ ...valid, currency: "FCFA" })).toContain("Code devise ISO sur 3 lettres (ex. XOF).");
    expect(messages({ ...valid, owner: { ...valid.owner, email: "nope" } })).toContain("Adresse e-mail invalide.");
  });
});

describe("toCreateTenantPayload", () => {
  it("retire la confirmation et le mot de passe vide", () => {
    const payload = toCreateTenantPayload(valid);
    expect(payload.owner).toEqual({ email: "owner@acme.test", firstName: "Awa", lastName: "Koné" });
  });

  it("conserve le mot de passe saisi mais jamais sa confirmation", () => {
    const payload = toCreateTenantPayload({
      ...valid,
      owner: { ...valid.owner, password: "ChangeMe123!", confirmPassword: "ChangeMe123!" },
    });
    expect(payload.owner).toMatchObject({ password: "ChangeMe123!" });
    expect(payload.owner).not.toHaveProperty("confirmPassword");
  });
});

describe("suspendTenantSchema", () => {
  it("exige un motif d'au moins 3 caractères", () => {
    expect(suspendTenantSchema.safeParse({ reason: "ab" }).success).toBe(false);
    expect(suspendTenantSchema.safeParse({ reason: "Impayé" }).success).toBe(true);
  });
});
