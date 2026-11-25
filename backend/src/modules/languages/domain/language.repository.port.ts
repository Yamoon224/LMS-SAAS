/** Persistance des activations : seules les langues explicitement désactivées sont mémorisées comme telles. */
export interface LanguageRepositoryPort {
  listDisabledCodes(): Promise<string[]>;
  setEnabled(code: string, enabled: boolean): Promise<void>;
}

export const LANGUAGE_REPOSITORY = Symbol("LANGUAGE_REPOSITORY");
