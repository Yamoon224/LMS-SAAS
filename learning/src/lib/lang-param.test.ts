import { describe, expect, it } from "vitest";

import { parseLangParam, withCookie } from "./lang-param";

describe("parseLangParam", () => {
  it("accepte les langues connues", () => {
    expect(parseLangParam("en")).toBe("en");
    expect(parseLangParam("ar")).toBe("ar");
  });

  it.each([null, undefined, "", "EN", "xx", "en-GB", "fr;x", "<script>", "../fr"])("ignore %j", (value) => {
    expect(parseLangParam(value)).toBeUndefined();
  });
});

describe("withCookie", () => {
  it("ajoute le cookie à un en-tête vide", () => {
    expect(withCookie(null, "learning_locale", "en")).toBe("learning_locale=en");
  });

  it("remplace une valeur existante sans toucher aux autres cookies", () => {
    expect(withCookie("a=1; learning_locale=fr; b=2", "learning_locale", "de")).toBe("a=1; b=2; learning_locale=de");
  });
});
