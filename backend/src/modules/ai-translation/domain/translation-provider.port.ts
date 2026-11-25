export interface TranslationRequest {
  sourceLocale: string;
  targetLocale: string;
  /** Texte brut ou HTML — le fournisseur doit préserver le balisage s'il est présent. */
  content: string;
}

/**
 * Port vers le fournisseur de traduction automatique (section 12.5). Séparé
 * du comptage de mots (domaine, pur) et du débit de crédits (CreditWallet) :
 * ce port ne fait que traduire un texte donné, sans connaître la
 * tarification ni la persistance.
 */
export interface TranslationProviderPort {
  translate(request: TranslationRequest): Promise<string>;
}

export const TRANSLATION_PROVIDER = Symbol("TRANSLATION_PROVIDER");
