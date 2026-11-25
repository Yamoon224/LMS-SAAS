import { isLocale } from "./i18n/locales";
import type { Locale } from "./i18n/locales";

/**
 * Paramètre `?lang=xx` : rend une langue de l'interface adressable par URL (liens `hreflang` du SEO, liens
 * partageables). Seules les huit langues connues sont acceptées ; le reste est ignoré.
 */
export function parseLangParam(value: string | null | undefined): Locale | undefined {
  return isLocale(value) ? value : undefined;
}

/** En-tête `Cookie` dont le cookie `name` est remplacé (ou ajouté) : le choix s'applique à la requête en cours. */
export function withCookie(header: string | null | undefined, name: string, value: string): string {
  const others = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${name}=`));
  return [...others, `${name}=${value}`].join("; ");
}
