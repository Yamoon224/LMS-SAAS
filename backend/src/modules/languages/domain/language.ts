import { DomainError } from "@shared/errors";

/**
 * ADM-40 : les huit langues de la plateforme (décision D5 du cahier des charges) avec activation par langue.
 * La même liste sert à l'interface et à la traduction IA des formations. Fonctions pures (section 13.1).
 */
export interface Language {
  code: string;
  /** Nom dans la langue elle-même, pour les sélecteurs. */
  nativeName: string;
  /** Sens d'écriture droite-à-gauche (arabe). */
  rtl: boolean;
}

export const LANGUAGES: readonly Language[] = [
  { code: "fr", nativeName: "Français", rtl: false },
  { code: "en", nativeName: "English", rtl: false },
  { code: "es", nativeName: "Español", rtl: false },
  { code: "de", nativeName: "Deutsch", rtl: false },
  { code: "ar", nativeName: "العربية", rtl: true },
  { code: "zh", nativeName: "中文", rtl: false },
  { code: "ru", nativeName: "Русский", rtl: false },
  { code: "tr", nativeName: "Türkçe", rtl: false },
];

/** Langue par défaut de la plateforme : toujours active, elle ne peut pas être désactivée. */
export const DEFAULT_LANGUAGE_CODE = "fr";

export interface LanguageStatus extends Language {
  enabled: boolean;
  /** Vrai pour la langue par défaut : l'interrupteur est verrouillé. */
  locked: boolean;
}

export class LanguageUnknownError extends DomainError {
  readonly code = "LANGUE_INCONNUE";
}

export class LanguageNotDisableableError extends DomainError {
  readonly code = "LANGUE_PAR_DEFAUT_NON_DESACTIVABLE";
}

export class LanguageNotEnabledError extends DomainError {
  readonly code = "LANGUE_NON_ACTIVEE";
}

export function isSupportedLanguage(code: string): boolean {
  return LANGUAGES.some((language) => language.code === code);
}

/** Statut de chaque langue à partir des codes désactivés ; la langue par défaut est toujours active. */
export function resolveLanguages(disabledCodes: ReadonlySet<string>): LanguageStatus[] {
  return LANGUAGES.map((language) => {
    const locked = language.code === DEFAULT_LANGUAGE_CODE;
    return { ...language, locked, enabled: locked || !disabledCodes.has(language.code) };
  });
}

export function enabledLanguages(disabledCodes: ReadonlySet<string>): Language[] {
  return resolveLanguages(disabledCodes)
    .filter((language) => language.enabled)
    .map(({ code, nativeName, rtl }) => ({ code, nativeName, rtl }));
}

/** Une langue inconnue est refusée, et la langue par défaut ne peut pas être désactivée. */
export function assertCanSetEnabled(code: string, enabled: boolean): void {
  if (!isSupportedLanguage(code)) {
    throw new LanguageUnknownError(`Langue inconnue: ${code}`);
  }
  if (!enabled && code === DEFAULT_LANGUAGE_CODE) {
    throw new LanguageNotDisableableError("Le français est la langue par défaut : il ne peut pas être désactivé.");
  }
}

/** Refuse une langue inconnue ou désactivée (ex. langue cible d'une traduction IA, langue préférée d'un profil). */
export function assertEnabled(code: string, disabledCodes: ReadonlySet<string>): void {
  if (!isSupportedLanguage(code)) {
    throw new LanguageUnknownError(`Langue inconnue: ${code}`);
  }
  if (!enabledLanguages(disabledCodes).some((language) => language.code === code)) {
    throw new LanguageNotEnabledError(`La langue "${code}" n'est pas activée sur la plateforme.`);
  }
}
