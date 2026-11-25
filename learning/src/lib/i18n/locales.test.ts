import { describe, expect, it } from "vitest";

import { INTL_TAGS, LOCALE_NAMES, LOCALES, parseAcceptLanguage, resolveLocale, textDirection } from "./locales";

describe("parseAcceptLanguage", () => {
  it("trie par qualité puis par ordre et réduit à la langue principale", () => {
    expect(parseAcceptLanguage("en-GB;q=0.8, fr-CA, de;q=0.9")).toEqual(["fr", "de", "en"]);
  });

  it("ignore les valeurs mal formées, les jokers et q=0", () => {
    expect(parseAcceptLanguage("*, ;q=1, e, xx-1234;q=abc, es;q=0, ru")).toEqual(["ru"]);
  });

  it("renvoie une liste vide sans en-tête", () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
  });
});

describe("resolveLocale", () => {
  it("le cookie l'emporte sur le navigateur", () => {
    expect(resolveLocale({ cookie: "de", acceptLanguage: "en" })).toBe("de");
  });

  it("à défaut de cookie, prend la première langue du navigateur connue", () => {
    expect(resolveLocale({ acceptLanguage: "pt-BR, tr;q=0.9, en;q=0.5" })).toBe("tr");
  });

  it("retombe sur le français sans rien d'exploitable", () => {
    expect(resolveLocale({ cookie: "klingon", acceptLanguage: "pt" })).toBe("fr");
    expect(resolveLocale({})).toBe("fr");
  });

  it("n'accepte qu'une langue activée par la plateforme", () => {
    expect(resolveLocale({ cookie: "de", acceptLanguage: "en", enabled: ["fr", "en"] })).toBe("en");
  });

  it("le français reste utilisable même s'il n'est pas dans la liste reçue", () => {
    expect(resolveLocale({ cookie: "fr", enabled: ["en"] })).toBe("fr");
  });

  it("refuse une valeur de cookie qui n'est pas un code de langue (pas d'injection)", () => {
    expect(resolveLocale({ cookie: "<script>" })).toBe("fr");
  });
});

describe("textDirection", () => {
  it("seul l'arabe s'écrit de droite à gauche", () => {
    expect(LOCALES.filter((locale) => textDirection(locale) === "rtl")).toEqual(["ar"]);
  });
});

describe("tables de langues", () => {
  it("chaque langue a un nom et une étiquette Intl valide", () => {
    for (const locale of LOCALES) {
      expect(LOCALE_NAMES[locale]).toBeTruthy();
      expect(() => new Intl.DateTimeFormat(INTL_TAGS[locale])).not.toThrow();
    }
  });
});
