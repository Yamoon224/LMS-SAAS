/**
 * ADM-18/BE: "le coût d'une traduction est calculé au prorata du nombre de
 * mots." Fonction pure (section 13.1) : convertit un nombre de mots en
 * crédits IA requis, selon le taux configuré par la plateforme
 * (crédits par mot), arrondi au supérieur pour ne jamais sous-facturer.
 */
export function estimateTranslationCredits(wordCount: number, creditsPerWord: number): number {
  return Math.ceil(wordCount * creditsPerWord);
}
