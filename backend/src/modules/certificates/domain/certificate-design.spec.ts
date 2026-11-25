import {
  assertValidDesign,
  contrastRatio,
  DEFAULT_DESIGN,
  InvalidCertificateDesignError,
  isHexColor,
  readabilityWarnings,
  resolveDesign,
  validateDesign,
} from "./certificate-design";

describe("isHexColor", () => {
  it.each(["#1e3a8a", "#FFFFFF", "#000000"])("accepte %s", (value) => expect(isHexColor(value)).toBe(true));

  it.each(["", "1e3a8a", "#fff", "#1e3a8a;", "red", "#gggggg", "#1e3a8a00", "url(javascript:1)", 123, null, undefined])(
    "refuse %j",
    (value) => expect(isHexColor(value)).toBe(false),
  );
});

describe("resolveDesign", () => {
  it("applique les valeurs par défaut à un design vide ou absent", () => {
    expect(resolveDesign({})).toEqual(DEFAULT_DESIGN);
    expect(resolveDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(resolveDesign(undefined)).toEqual(DEFAULT_DESIGN);
  });

  it("conserve les réglages valides", () => {
    const resolved = resolveDesign({
      primaryColor: "#aa0000",
      textColor: "#000000",
      secondaryColor: "#333333",
      fontFamily: "TIMES",
      orientation: "PORTRAIT",
      borderStyle: "DOUBLE",
    });
    expect(resolved).toMatchObject({
      primaryColor: "#aa0000",
      textColor: "#000000",
      secondaryColor: "#333333",
      fontFamily: "TIMES",
      orientation: "PORTRAIT",
      borderStyle: "DOUBLE",
    });
  });

  it("ne transmet jamais une valeur libre au moteur PDF : couleur ou choix invalide -> valeur par défaut", () => {
    const resolved = resolveDesign({
      primaryColor: "javascript:alert(1)",
      textColor: "#12",
      fontFamily: "COMIC_SANS" as never,
      orientation: "DIAGONAL" as never,
      borderStyle: "EXOTIC" as never,
    });
    expect(resolved).toEqual(DEFAULT_DESIGN);
  });

  it("rend les anciens modèles (seulement primaryColor, éventuellement libre) lisibles sans erreur", () => {
    expect(resolveDesign({ primaryColor: "#123456" }).primaryColor).toBe("#123456");
    expect(resolveDesign({ primaryColor: "bleu" }).primaryColor).toBe(DEFAULT_DESIGN.primaryColor);
  });
});

describe("validateDesign / assertValidDesign", () => {
  it("accepte un design vide et un design complet valide", () => {
    expect(validateDesign({})).toEqual([]);
    expect(validateDesign({ primaryColor: "#112233", fontFamily: "COURIER", orientation: "LANDSCAPE", borderStyle: "SIMPLE" })).toEqual(
      [],
    );
  });

  it("liste tous les problèmes d'un coup", () => {
    const problems = validateDesign({ primaryColor: "rouge", textColor: "#12", fontFamily: "ARIAL" as never });
    expect(problems).toHaveLength(3);
    expect(problems.join(" ")).toMatch(/primaryColor/);
    expect(problems.join(" ")).toMatch(/textColor/);
    expect(problems.join(" ")).toMatch(/fontFamily/);
  });

  it("assertValidDesign lève une erreur métier typée", () => {
    expect(() => assertValidDesign({ primaryColor: "rouge" })).toThrow(InvalidCertificateDesignError);
    expect(() => assertValidDesign({ primaryColor: "#112233" })).not.toThrow();
  });
});

describe("contrastRatio / readabilityWarnings", () => {
  it("le noir sur blanc est au maximum (21:1), le blanc sur blanc au minimum (1:1)", () => {
    expect(contrastRatio("#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff")).toBeCloseTo(1, 5);
  });

  it("ne signale rien pour le design par défaut", () => {
    expect(readabilityWarnings({})).toEqual([]);
  });

  it("signale un texte clair sur fond blanc", () => {
    const warnings = readabilityWarnings({ textColor: "#eeeeee", primaryColor: "#ffff00", secondaryColor: "#f0f0f0" });
    expect(warnings).toHaveLength(3);
  });
});
