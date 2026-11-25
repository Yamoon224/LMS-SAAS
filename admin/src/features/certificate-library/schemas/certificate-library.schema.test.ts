import { describe, expect, it } from "vitest";

import { designToFormValues } from "./certificate-design-form";
import { libraryFormSchema, libraryTemplateSchema, toDesign, toFormValues } from "./certificate-library.schema";
import type { LibraryTemplate } from "./certificate-library.schema";

const valid = {
  ...toFormValues(),
  name: "Classique bleu",
  fontFamily: "TIMES",
  orientation: "PORTRAIT",
  borderStyle: "DOUBLE",
} as const;

describe("libraryFormSchema", () => {
  it("accepte un formulaire complet valide", () => {
    expect(libraryFormSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["rouge", "#fff", "#1e3a8", "1e3a8a", "#gggggg", "javascript:1"])(
    "refuse la couleur %j",
    (primaryColor) => {
      expect(libraryFormSchema.safeParse({ ...valid, primaryColor }).success).toBe(false);
    },
  );

  it("refuse un nom trop court ou trop long, et une police ou orientation inconnue", () => {
    expect(libraryFormSchema.safeParse({ ...valid, name: " a " }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, name: "x".repeat(121) }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, fontFamily: "COMIC" }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, orientation: "DIAGONAL" }).success).toBe(false);
  });
});

describe("toDesign / toFormValues", () => {
  it("n'envoie ni le nom ni la description, et omet les champs vides", () => {
    const design = toDesign({ ...valid });
    expect(design).not.toHaveProperty("name");
    expect(design).not.toHaveProperty("description");
    expect(design).not.toHaveProperty("logoUrl");
    expect(design).not.toHaveProperty("signatories");
    expect(design).toMatchObject({ fontFamily: "TIMES", pageFormat: "A4", showQrCode: true });
  });

  it("construit 1 à 2 signataires et refuse les URL non http(s) et les balises", () => {
    const withSigners = { ...valid, signatory1Name: "Awa", signatory1Title: "Directrice", signatory2Name: "Paul" };
    expect(toDesign(withSigners).signatories).toEqual([{ name: "Awa", title: "Directrice" }, { name: "Paul" }]);
    expect(libraryFormSchema.safeParse({ ...valid, logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, title: "<b>x</b>" }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, bodyText: "{{secret}}" }).success).toBe(false);
    expect(libraryFormSchema.safeParse({ ...valid, bodyText: "{{learnerName}} {{courseTitle}}" }).success).toBe(true);
  });

  it("reprend l'ancienne signature comme signataire 1", () => {
    expect(designToFormValues({ signatureName: "Awa", signatureImageUrl: "https://x.test/s.png" })).toMatchObject({
      signatory1Name: "Awa",
      signatory1ImageUrl: "https://x.test/s.png",
    });
  });

  it("préremplit un nouveau modèle avec les valeurs par défaut du rendu", () => {
    expect(toFormValues()).toMatchObject({
      primaryColor: "#1e3a8a",
      fontFamily: "HELVETICA",
      orientation: "LANDSCAPE",
      borderStyle: "NONE",
    });
  });

  it("reprend les réglages d'un modèle existant, y compris un ancien modèle sans police ni bordure", () => {
    const template: LibraryTemplate = libraryTemplateSchema.parse({
      id: "1",
      name: "Ancien",
      description: null,
      design: { primaryColor: "#123456" },
      isPublished: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      warnings: [],
    });
    expect(toFormValues(template)).toMatchObject({ name: "Ancien", primaryColor: "#123456", fontFamily: "HELVETICA" });
  });
});
