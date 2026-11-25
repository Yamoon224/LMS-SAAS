import { base32Decode, base32Encode } from "./base32";
import { generateRecoveryCodes, looksLikeRecoveryCode, normalizeRecoveryCode } from "./recovery-codes";
import {
  buildOtpauthUri,
  constantTimeEquals,
  generateTotpSecret,
  hotp,
  TOTP_SECRET_BYTES,
  totpAtStep,
  totpStepAt,
  verifyTotp,
} from "./totp";
import { isTwoFactorMandatory } from "./two-factor.policy";

const RFC_SECRET = Buffer.from("12345678901234567890", "ascii");

describe("HOTP (RFC 4226, annexe D)", () => {
  const expected = ["755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"];
  it.each(expected.map((code, counter) => [counter, code] as const))("compteur %i -> %s", (counter, code) => {
    expect(hotp(RFC_SECRET, counter)).toBe(code);
  });
});

describe("TOTP (RFC 6238, annexe B, SHA-1, 8 chiffres)", () => {
  const vectors: Array<[number, string]> = [
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ];
  it.each(vectors)("t=%i -> %s", (seconds, code) => {
    expect(totpAtStep(RFC_SECRET, totpStepAt(seconds * 1000), 8)).toBe(code);
  });

  it("garde les zéros en tête sur 6 chiffres", () => {
    expect(totpAtStep(RFC_SECRET, totpStepAt(1111111109 * 1000))).toBe("081804");
  });
});

describe("Base32 (RFC 4648)", () => {
  const vectors: Array<[string, string]> = [
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"],
  ];
  it.each(vectors)("%s <-> %s", (plain, encoded) => {
    expect(base32Encode(Buffer.from(plain))).toBe(encoded);
    expect(base32Decode(encoded).toString()).toBe(plain);
  });

  it("tolère casse, espaces et remplissage, refuse un caractère invalide", () => {
    expect(base32Decode("mzxw 6ytb oi======").toString()).toBe("foobar");
    expect(() => base32Decode("MZXW1")).toThrow();
  });
});

describe("génération du secret et de l'URI", () => {
  it("produit 160 bits aléatoires, tous différents", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toHaveLength(TOTP_SECRET_BYTES);
    expect(a.equals(b)).toBe(false);
    expect(base32Encode(a)).toHaveLength(32);
  });

  it("construit une URI otpauth lisible, avec l'émetteur et l'e-mail encodés", () => {
    const uri = buildOtpauthUri({ issuer: "SaaS LMS", account: "a+b@ex.com", secret: RFC_SECRET });
    expect(uri.startsWith("otpauth://totp/SaaS%20LMS:a%2Bb%40ex.com?")).toBe(true);
    const params = new URL(uri).searchParams;
    expect(params.get("secret")).toBe(base32Encode(RFC_SECRET));
    expect(params.get("issuer")).toBe("SaaS LMS");
    expect(params.get("digits")).toBe("6");
    expect(params.get("period")).toBe("30");
    expect(params.get("algorithm")).toBe("SHA1");
  });
});

describe("verifyTotp : fenêtre de dérive et rejeu", () => {
  const now = 1_700_000_000_000;
  const step = totpStepAt(now);
  const at = (delta: number) => totpAtStep(RFC_SECRET, step + delta);
  const check = (code: string, lastAcceptedStep: number | null = null) =>
    verifyTotp({ secret: RFC_SECRET, code, nowMs: now, lastAcceptedStep });

  it("accepte le pas courant, le précédent et le suivant", () => {
    expect(check(at(0))).toEqual({ valid: true, step });
    expect(check(at(-1))).toEqual({ valid: true, step: step - 1 });
    expect(check(at(1))).toEqual({ valid: true, step: step + 1 });
  });

  it("refuse deux pas ou plus d'écart (code expiré ou trop en avance)", () => {
    expect(check(at(-2)).valid).toBe(false);
    expect(check(at(2)).valid).toBe(false);
    expect(check(at(-3)).valid).toBe(false);
  });

  it("refuse le rejeu : un pas déjà accepté (ou antérieur) est refusé", () => {
    expect(check(at(0), step).valid).toBe(false);
    expect(check(at(-1), step).valid).toBe(false);
    expect(check(at(0), step - 1).valid).toBe(true);
    expect(check(at(1), step).valid).toBe(true);
  });

  it("refuse les formats invalides sans calcul", () => {
    for (const bad of ["", "12345", "1234567", "12345a", "０１２３４５", " 123456", "123 456"]) {
      expect(check(bad).valid).toBe(false);
    }
  });

  it("refuse un code issu d'un autre secret", () => {
    const other = totpAtStep(generateTotpSecret(), step);
    expect(other === at(0) || other === at(-1) || other === at(1)).toBe(false);
    expect(check(other).valid).toBe(false);
  });
});

describe("constantTimeEquals", () => {
  it("compare sans lever d'erreur sur des longueurs différentes", () => {
    expect(constantTimeEquals("123456", "123456")).toBe(true);
    expect(constantTimeEquals("123456", "123457")).toBe(false);
    expect(constantTimeEquals("123456", "12345")).toBe(false);
  });
});

describe("codes de récupération", () => {
  it("génère 8 codes distincts au format XXXXX-XXXXX sans caractères ambigus", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{5}-[A-HJKMNP-Z2-9]{5}$/);
  });

  it("normalise la saisie (casse, tiret, espaces) et distingue un code TOTP", () => {
    expect(normalizeRecoveryCode(" abcde-fgh23 ")).toBe("ABCDEFGH23");
    expect(looksLikeRecoveryCode("abcde-fgh23")).toBe(true);
    expect(looksLikeRecoveryCode("123456")).toBe(false);
  });
});

describe("obligation de 2FA", () => {
  it("s'applique aux comptes plateforme et au propriétaire d'entreprise", () => {
    expect(isTwoFactorMandatory({ type: "PLATFORM_ADMIN", roles: [] })).toBe(true);
    expect(isTwoFactorMandatory({ type: "COMPANY_USER", roles: ["Propriétaire d'entreprise"] })).toBe(true);
  });
  it("laisse facultative celle des autres membres et des apprenants", () => {
    expect(isTwoFactorMandatory({ type: "COMPANY_USER", roles: ["Gestionnaire"] })).toBe(false);
    expect(isTwoFactorMandatory({ type: "LEARNER", roles: ["Apprenant"] })).toBe(false);
  });
});
