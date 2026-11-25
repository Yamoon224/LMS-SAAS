import { renderTemplateText, resolveDesign, validateDesign } from "./certificate-design";

describe("options enrichies du design", () => {
  const full = {
    pageFormat: "LETTER",
    borderStyle: "ORNATE",
    borderColor: "#112233",
    backgroundColor: "#fafafa",
    backgroundOpacity: 0.5,
    backgroundUrl: "https://exemple.test/fond.png",
    logoUrl: "https://exemple.test/logo.png",
    logoPosition: "LEFT",
    logoSize: "LARGE",
    watermarkType: "TEXT",
    watermarkText: "ORIGINAL",
    watermarkOpacity: 0.1,
    title: "Attestation",
    bodyText: "{{learnerName}} a suivi {{courseTitle}} le {{date}} ({{score}}) n° {{certificateNumber}}.",
    footerText: "Organisme n° 123",
    language: "EN",
    showScore: false,
    showDuration: true,
    signatories: [{ name: "Awa Koné", title: "Directrice", imageUrl: "https://exemple.test/sig.png" }, { name: "Paul" }],
  };

  it("accepte un design complet valide", () => {
    expect(validateDesign(full as never)).toEqual([]);
  });

  it("applique les valeurs par défaut aux anciens modèles (borderColor suit la couleur principale)", () => {
    const resolved = resolveDesign({ primaryColor: "#123456" });
    expect(resolved).toMatchObject({ pageFormat: "A4", borderColor: "#123456", showQrCode: true, showDuration: false, language: "FR" });
    expect(resolved.signatories).toEqual([]);
  });

  it("utilise l'ancienne signature comme unique signataire", () => {
    const resolved = resolveDesign({ signatureName: "Awa", signatureImageUrl: "https://exemple.test/s.png" });
    expect(resolved.signatories).toEqual([{ name: "Awa", imageUrl: "https://exemple.test/s.png" }]);
  });

  it.each([
    ["URL javascript", { logoUrl: "javascript:alert(1)" }],
    ["URL data", { backgroundUrl: "data:text/html,<script>" }],
    ["URL ftp", { badgeUrl: "ftp://exemple.test/a.png" }],
    ["URL avec identifiants", { logoUrl: "https://user:pass@exemple.test/a.png" }],
    ["balise dans le titre", { title: "<script>alert(1)</script>" }],
    ["titre trop long", { title: "a".repeat(81) }],
    ["variable inconnue", { bodyText: "Bonjour {{password}}" }],
    ["couleur CSS", { borderColor: "red;background:url(x)" }],
    ["format inconnu", { pageFormat: "A0" }],
    ["opacité hors bornes", { backgroundOpacity: 2 }],
    ["filigrane trop opaque", { watermarkOpacity: 0.9 }],
    ["3 signataires", { signatories: [{ name: "a" }, { name: "b" }, { name: "c" }] }],
    ["signataire sans nom", { signatories: [{ name: " " }] }],
    ["booléen invalide", { showScore: "oui" }],
  ])("refuse : %s", (_label, patch) => {
    expect(validateDesign(patch as never).length).toBeGreaterThan(0);
  });

  it("assainit au rendu un design corrompu (URL, texte, nombres)", () => {
    const resolved = resolveDesign({
      logoUrl: "javascript:alert(1)",
      title: "<b>Titre</b>\u0000",
      backgroundOpacity: 42,
      watermarkOpacity: -3,
      signatories: [{ name: "<i>x</i>", imageUrl: "file:///etc/passwd" }, { name: "b" }, { name: "c" }],
    } as never);
    expect(resolved.logoUrl).toBeUndefined();
    expect(resolved.title).toBe("bTitre/b");
    expect(resolved.backgroundOpacity).toBe(1);
    expect(resolved.watermarkOpacity).toBe(0.02);
    expect(resolved.signatories.map((s) => s.name)).toEqual(["ix/i", "b"]);
    expect(resolved.signatories[0]?.imageUrl).toBeUndefined();
  });
});

describe("renderTemplateText", () => {
  const values = { learnerName: "Awa", courseTitle: "Excel", date: "01/01/2026", score: "90%", certificateNumber: "C-1" };

  it("remplace les variables connues, y compris avec espaces, et laisse les inconnues", () => {
    expect(renderTemplateText("{{learnerName}} / {{ courseTitle }} / {{x}}", values)).toBe("Awa / Excel / {{x}}");
  });

  it("n'interprète pas une valeur contenant elle-même une variable", () => {
    expect(renderTemplateText("{{learnerName}}", { ...values, learnerName: "{{score}}" })).toBe("{{score}}");
  });
});
