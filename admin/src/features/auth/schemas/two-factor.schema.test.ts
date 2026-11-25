import { describe, expect, it } from "vitest";

import {
  formatRecoveryCodesFile,
  groupSecret,
  passwordAndCodeSchema,
  totpCodeSchema,
  twoFactorSetupSchema,
  verifyCodeSchema,
} from "./two-factor.schema";

describe("totpCodeSchema", () => {
  it("accepte exactement 6 chiffres", () => {
    expect(totpCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
  });

  it("refuse les autres formes (longueur, lettres, espaces, code de récupération)", () => {
    for (const code of ["", "12345", "1234567", "12345a", "123 456", "ABCDE-FGH23"]) {
      expect(totpCodeSchema.safeParse({ code }).success).toBe(false);
    }
  });
});

describe("verifyCodeSchema", () => {
  it("accepte un code TOTP ou un code de récupération (tiret ou espace facultatif)", () => {
    for (const code of ["123456", "ABCDE-FGH23", "abcde fgh23", "ABCDEFGH23", " 123456 "]) {
      expect(verifyCodeSchema.safeParse({ code }).success).toBe(true);
    }
  });

  it("refuse les saisies hors format", () => {
    for (const code of ["", "12345", "ABCD-EFGH", "ABCDE-FGH23-X", "<script>", "12345 6"]) {
      expect(verifyCodeSchema.safeParse({ code }).success).toBe(false);
    }
  });
});

describe("passwordAndCodeSchema", () => {
  it("exige un mot de passe d'au moins 8 caractères et un code valide", () => {
    expect(passwordAndCodeSchema.safeParse({ password: "S3cret-password!", code: "123456" }).success).toBe(true);
    expect(passwordAndCodeSchema.safeParse({ password: "short", code: "123456" }).success).toBe(false);
    expect(passwordAndCodeSchema.safeParse({ password: "S3cret-password!", code: "nope" }).success).toBe(false);
  });
});

describe("twoFactorSetupSchema", () => {
  it("n'accepte qu'un QR code en data-URL image", () => {
    const base = { secret: "ABCD", otpauthUri: "otpauth://totp/x" };
    expect(twoFactorSetupSchema.safeParse({ ...base, qrCodeDataUrl: "data:image/png;base64,AAA" }).success).toBe(true);
    expect(twoFactorSetupSchema.safeParse({ ...base, qrCodeDataUrl: "https://evil.example/qr.png" }).success).toBe(false);
  });
});

describe("helpers d'affichage", () => {
  it("formate le fichier de sauvegarde : un code par ligne, avertissement d'usage unique", () => {
    const text = formatRecoveryCodesFile(["AAAAA-BBBBB", "CCCCC-DDDDD"], new Date("2026-11-18T10:00:00Z"));
    expect(text).toContain("Générés le 2026-11-18");
    expect(text).toContain("une seule fois");
    expect(text.split("\n")).toEqual(expect.arrayContaining(["AAAAA-BBBBB", "CCCCC-DDDDD"]));
  });

  it("groupe le secret par blocs de 4", () => {
    expect(groupSecret("ABCDEFGHIJ")).toBe("ABCD EFGH IJ");
  });
});
