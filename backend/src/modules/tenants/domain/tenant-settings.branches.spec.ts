import {
  changedKeys,
  InvalidTenantSettingsError,
  normalizeEmail,
  normalizeHexColor,
  normalizeHttpsUrl,
  normalizePhone,
  normalizeText,
  validatePayoutAccount,
} from "./tenant-settings";

describe("normalizeHexColor - refus", () => {
  it.each(["#abc", "red", "#1234567", 42])("refuse %p", (value) => {
    expect(() => normalizeHexColor(value, "Couleur")).toThrow(InvalidTenantSettingsError);
  });
  it("undefined et null donnent null", () => {
    expect(normalizeHexColor(undefined, "C")).toBeNull();
    expect(normalizeHexColor(null, "C")).toBeNull();
  });
});

describe("normalizeHttpsUrl - refus", () => {
  it("vide donne null", () => {
    expect(normalizeHttpsUrl(undefined, "Logo")).toBeNull();
    expect(normalizeHttpsUrl(null, "Logo")).toBeNull();
  });
  it("refuse un non-texte, une URL illisible, http, javascript et les identifiants intégrés", () => {
    expect(() => normalizeHttpsUrl(12, "Logo")).toThrow(/doit être une URL/);
    expect(() => normalizeHttpsUrl("pas une url", "Logo")).toThrow(/pas une URL valide/);
    expect(() => normalizeHttpsUrl("http://a.com/x.png", "Logo")).toThrow(/https/);
    expect(() => normalizeHttpsUrl("javascript:alert(1)", "Logo")).toThrow(InvalidTenantSettingsError);
    expect(() => normalizeHttpsUrl("https://user:pw@a.com/x.png", "Logo")).toThrow(/https/);
  });
});

describe("normalizeText - cas limites", () => {
  it("texte requis absent ou null/undefined", () => {
    expect(() => normalizeText(undefined, "Nom", 10, { required: true })).toThrow(/obligatoire/);
    expect(normalizeText(null, "Nom", 10)).toBeNull();
    expect(normalizeText("<b></b>", "Nom", 10)).toBeNull();
  });
});

describe("normalizeEmail / normalizePhone", () => {
  it("vide donne null, e-mail valide en minuscules", () => {
    expect(normalizeEmail(undefined, "Mail")).toBeNull();
    expect(normalizeEmail(" Foo@Bar.COM ", "Mail")).toBe("foo@bar.com");
    expect(normalizePhone("", "Tel")).toBeNull();
  });
  it("téléphone : caractères interdits et longueur", () => {
    expect(() => normalizePhone("abc12345678", "Tel")).toThrow(/numéro valide/);
    expect(() => normalizePhone("12345", "Tel")).toThrow(/8 à 15 chiffres/);
    expect(normalizePhone("+225 07.00-00 00 00", "Tel")).toBe("+2250700000000");
  });
});

describe("validatePayoutAccount - cas limites", () => {
  it("numéro de compte manquant ou non texte", () => {
    expect(() => validatePayoutAccount({ type: "BANK", accountName: "A", accountNumber: "  " })).toThrow(/obligatoire/);
    expect(() => validatePayoutAccount({ type: "BANK", accountName: "A", accountNumber: 5 })).toThrow(/obligatoire/);
  });
});

describe("changedKeys - valeurs absentes", () => {
  it("traite undefined et null comme identiques", () => {
    expect(changedKeys({ a: undefined }, { a: null, b: "x" })).toEqual(["b"]);
  });
});
