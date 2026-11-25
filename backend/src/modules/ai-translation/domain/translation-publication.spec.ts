import { assertPublishable, buildTranslationOverview, TranslationNotPublishableError } from "./translation-publication";

describe("buildTranslationOverview", () => {
  const english = { locale: "en", status: "DRAFT" as const, origin: "AI" as const };
  const locales = [
    { locale: "fr", status: "PUBLISHED" as const, origin: "SOURCE" as const },
    english,
    { locale: "ar", status: "PUBLISHED" as const, origin: "AI" as const },
  ];

  it("liste les langues traduites avec leur couverture, hors langue d'origine, triées par code", () => {
    const overview = buildTranslationOverview(
      "fr",
      locales,
      new Map([
        ["en", 3],
        ["ar", 10],
      ]),
      10,
    );
    expect(overview.map((entry) => [entry.locale, entry.status, entry.lessonsTranslated, entry.coveragePercent])).toEqual([
      ["ar", "PUBLISHED", 10, 100],
      ["en", "DRAFT", 3, 30],
    ]);
  });

  it("ne dépasse jamais 100 % même si des leçons supprimées ont laissé des traductions", () => {
    const [entry] = buildTranslationOverview("fr", [english], new Map([["en", 12]]), 10);
    expect(entry).toMatchObject({ lessonsTranslated: 10, coveragePercent: 100 });
  });

  it("gère une formation sans leçon et une langue sans leçon traduite", () => {
    const [entry] = buildTranslationOverview("fr", [english], new Map(), 0);
    expect(entry).toMatchObject({ lessonsTranslated: 0, lessonsTotal: 0, coveragePercent: 0 });
  });
});

describe("assertPublishable", () => {
  it("accepte une langue traduite avec au moins une leçon", () => {
    expect(() => assertPublishable("fr", "en", true, 1)).not.toThrow();
  });

  it("refuse la langue d'origine", () => {
    expect(() => assertPublishable("fr", "fr", true, 5)).toThrow(TranslationNotPublishableError);
  });

  it("refuse une langue sans fiche traduite", () => {
    expect(() => assertPublishable("fr", "en", false, 5)).toThrow(/Aucune traduction/);
  });

  it("refuse une langue dont aucune leçon n'est traduite", () => {
    expect(() => assertPublishable("fr", "en", true, 0)).toThrow(/rien à publier/);
  });
});
