import { listAvailableLocales, localizeLesson, resolveContentLocale } from "./learner-locale";

describe("resolveContentLocale", () => {
  const available = ["en", "ar"];

  it("applique une langue traduite disponible", () => {
    expect(resolveContentLocale("en", "fr", available)).toBe("en");
  });

  it("reste dans la langue d'origine quand rien n'est demandé ou que l'origine est redemandée", () => {
    expect(resolveContentLocale(undefined, "fr", available)).toBeNull();
    expect(resolveContentLocale("", "fr", available)).toBeNull();
    expect(resolveContentLocale("  ", "fr", available)).toBeNull();
    expect(resolveContentLocale("fr", "fr", available)).toBeNull();
  });

  it("retombe sur l'origine pour une langue non disponible (non publiée, retirée, désactivée ou inconnue)", () => {
    expect(resolveContentLocale("de", "fr", available)).toBeNull();
    expect(resolveContentLocale("en", "fr", [])).toBeNull();
    expect(resolveContentLocale("fr; DROP TABLE", "fr", available)).toBeNull();
  });
});

describe("listAvailableLocales", () => {
  it("place l'origine d'abord, sans doublon", () => {
    expect(listAvailableLocales("fr", ["en", "fr", "ar", "en"])).toEqual(["fr", "en", "ar"]);
  });

  it("ne propose que l'origine sans traduction", () => {
    expect(listAvailableLocales("fr", [])).toEqual(["fr"]);
  });
});

describe("localizeLesson", () => {
  const source = { title: "Introduction", contentHtml: "<p>Bonjour</p>" };

  it("renvoie la leçon d'origine sans traduction", () => {
    expect(localizeLesson(source, null)).toBe(source);
  });

  it("utilise le titre et le contenu traduits", () => {
    expect(localizeLesson(source, { title: "Intro", contentHtml: "<p>Hello</p>" })).toEqual({
      title: "Intro",
      contentHtml: "<p>Hello</p>",
    });
  });

  it("retombe sur l'origine champ par champ quand la traduction est vide ou partielle", () => {
    expect(localizeLesson(source, { title: "Intro", contentHtml: null })).toEqual({
      title: "Intro",
      contentHtml: "<p>Bonjour</p>",
    });
    expect(localizeLesson(source, { title: "  ", contentHtml: "<p>Hello</p>" })).toEqual({
      title: "Introduction",
      contentHtml: "<p>Hello</p>",
    });
  });

  it("garde un contenu absent à null quand ni l'origine ni la traduction n'en ont", () => {
    expect(localizeLesson({ title: "Vidéo", contentHtml: null }, { title: "Video", contentHtml: null })).toEqual({
      title: "Video",
      contentHtml: null,
    });
  });
});
