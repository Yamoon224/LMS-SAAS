import { estimateTranslationCredits } from "./translation-credit-cost";

describe("estimateTranslationCredits (ADM-18)", () => {
  it("calcule le coût au prorata du nombre de mots", () => {
    expect(estimateTranslationCredits(1000, 0.1)).toBe(100);
  });

  it("arrondit au supérieur pour ne jamais sous-facturer", () => {
    expect(estimateTranslationCredits(1001, 0.1)).toBe(101);
  });

  it("retourne 0 pour un contenu vide", () => {
    expect(estimateTranslationCredits(0, 0.1)).toBe(0);
  });
});
