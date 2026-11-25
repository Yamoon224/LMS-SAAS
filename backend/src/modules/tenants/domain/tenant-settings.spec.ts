import {
  changedKeys,
  InvalidTenantSettingsError,
  maskAccountNumber,
  normalizeHexColor,
  normalizeHttpsUrl,
  normalizeIban,
  normalizePhone,
  normalizeRib,
  normalizeText,
  sanitizePlainText,
  validatePayoutAccount,
} from "./tenant-settings";

describe("normalizeHexColor", () => {
  it("accepte #RRGGBB et normalise en majuscules", () => {
    expect(normalizeHexColor("#1a2b3c", "Couleur")).toBe("#1A2B3C");
  });
  it("vide -> null", () => {
    expect(normalizeHexColor("", "Couleur")).toBeNull();
  });
  it.each(["red", "#12", "#12345", "#GGGGGG", "javascript:alert(1)", "#fff;background:url(x)", "#1234567"])("refuse %s", (value) => {
    expect(() => normalizeHexColor(value, "Couleur")).toThrow(InvalidTenantSettingsError);
  });
});

describe("normalizeHttpsUrl", () => {
  it("accepte https", () => {
    expect(normalizeHttpsUrl("https://cdn.acme.com/logo.png", "Logo")).toBe("https://cdn.acme.com/logo.png");
  });
  it.each(["http://acme.com/logo.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://x.com/a", "//evil.com/a", "/logo.png", "https://user:pw@acme.com/a", "pas une url"])(
    "refuse %s",
    (value) => {
      expect(() => normalizeHttpsUrl(value, "Logo")).toThrow(InvalidTenantSettingsError);
    },
  );
  it("refuse une URL démesurée", () => {
    expect(() => normalizeHttpsUrl(`https://a.com/${"x".repeat(600)}`, "Logo")).toThrow(InvalidTenantSettingsError);
  });
});

describe("sanitizePlainText / normalizeText", () => {
  it("retire le HTML et les chevrons", () => {
    expect(sanitizePlainText("Virez <b>vite</b><script>alert(1)</script> ici")).toBe("Virez vitealert(1) ici");
    expect(sanitizePlainText("a < b > c")).toBe("a  c");
  });
  it("conserve les retours à la ligne en mode multiligne uniquement", () => {
    expect(sanitizePlainText("l1\nl2", true)).toBe("l1\nl2");
    expect(sanitizePlainText("l1\nl2")).toBe("l1l2");
  });
  it("refuse un texte trop long ou non textuel", () => {
    expect(() => normalizeText("x".repeat(2001), "Instructions", 2000)).toThrow(InvalidTenantSettingsError);
    expect(() => normalizeText(42, "Instructions", 2000)).toThrow(InvalidTenantSettingsError);
  });
  it("un champ requis réduit à du HTML vide est refusé", () => {
    expect(() => normalizeText("<b></b>", "Nom", 10, { required: true })).toThrow(InvalidTenantSettingsError);
  });
});

describe("normalizePhone", () => {
  it("normalise", () => {
    expect(normalizePhone("+225 07 12 34 56 78", "Tél")).toBe("+2250712345678");
  });
  it.each(["12345", "abcdefghij", "+22507123456789012345"])("refuse %s", (value) => {
    expect(() => normalizePhone(value, "Tél")).toThrow(InvalidTenantSettingsError);
  });
});

describe("IBAN / RIB", () => {
  it("valide des IBAN réels", () => {
    expect(normalizeIban("FR76 3000 6000 0112 3456 7890 189")).toBe("FR7630006000011234567890189");
    expect(normalizeIban("ci93 ci00 8011 1301 1342 9120 0589")).toBe("CI93CI0080111301134291200589");
  });
  it("refuse un IBAN à la clé fausse", () => {
    expect(normalizeIban("FR7630006000011234567890188")).toBeNull();
    expect(normalizeIban("n'importe quoi")).toBeNull();
  });
  it("valide un RIB à clé correcte et refuse une clé fausse", () => {
    expect(normalizeRib("30002 00550 0000157841Z 25")).toBe("30002005500000157841Z25");
    expect(normalizeRib("30002 00550 0000157841Z 26")).toBeNull();
  });
});

describe("validatePayoutAccount", () => {
  it("Mobile Money valide", () => {
    expect(validatePayoutAccount({ type: "MOBILE_MONEY", operator: "WAVE", accountNumber: "+225 0712345678", accountName: "Acme SARL" })).toEqual({
      type: "MOBILE_MONEY",
      operator: "WAVE",
      accountName: "Acme SARL",
      accountNumber: "+2250712345678",
    });
  });
  it("Mobile Money : opérateur inconnu refusé", () => {
    expect(() => validatePayoutAccount({ type: "MOBILE_MONEY", operator: "PAYPAL", accountNumber: "0712345678", accountName: "A B" })).toThrow(
      InvalidTenantSettingsError,
    );
  });
  it("banque : IBAN invalide refusé", () => {
    expect(() => validatePayoutAccount({ type: "BANK", accountNumber: "FR0000000000000000000000000", accountName: "Acme" })).toThrow(
      InvalidTenantSettingsError,
    );
  });
  it("banque : IBAN valide accepté sans opérateur", () => {
    const result = validatePayoutAccount({ type: "BANK", operator: "WAVE", accountNumber: "FR7630006000011234567890189", accountName: "Acme" });
    expect(result.operator).toBeNull();
    expect(result.accountNumber).toBe("FR7630006000011234567890189");
  });
  it("titulaire obligatoire, type inconnu refusé", () => {
    expect(() => validatePayoutAccount({ type: "BANK", accountNumber: "FR7630006000011234567890189", accountName: "" })).toThrow();
    expect(() => validatePayoutAccount({ type: "CRYPTO", accountNumber: "x", accountName: "A" })).toThrow(InvalidTenantSettingsError);
  });
});

describe("maskAccountNumber / changedKeys", () => {
  it("n'expose que 4 caractères", () => {
    expect(maskAccountNumber("FR7630006000011234567890189")).toBe("***0189");
  });
  it("ne liste que les clés modifiées", () => {
    expect(changedKeys({ a: 1, b: "x", c: null }, { a: 1, b: "y", c: undefined, d: 2 })).toEqual(["b", "d"]);
  });
});
