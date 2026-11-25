import { mergeLocales } from "./supervision";

describe("mergeLocales", () => {
  it("place la langue source en premier et retire les doublons", () => {
    expect(mergeLocales("fr", ["en", "fr", "ar", "en"])).toEqual(["fr", "en", "ar"]);
  });

  it("renvoie la seule langue source sans traduction", () => {
    expect(mergeLocales("fr", [])).toEqual(["fr"]);
  });
});
