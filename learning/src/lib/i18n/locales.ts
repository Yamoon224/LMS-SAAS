/**
 * Langues de l'interface apprenant (PUB-15). Les huit langues du cahier des charges (décision D5) ;
 * celles réellement proposées sont celles que l'Admin a activées (GET /public/languages).
 * Fonctions pures : aucune dépendance à Next ni au navigateur.
 */
export const LOCALES = ["fr", "en", "es", "de", "ar", "zh", "ru", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Cookie de la langue choisie (lisible par le navigateur : le sélecteur l'écrit). */
export const LOCALE_COOKIE = "learning_locale";

/** Nom de chaque langue DANS cette langue : identique quelle que soit la langue courante. */
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ar: "العربية",
  zh: "中文",
  ru: "Русский",
  tr: "Türkçe",
};

/** Étiquette BCP 47 passée à `Intl` pour les dates, nombres et temps relatifs. */
export const INTL_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  ar: "ar",
  zh: "zh-CN",
  ru: "ru-RU",
  tr: "tr-TR",
};

const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function textDirection(locale: string): "rtl" | "ltr" {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}

/**
 * Langues préférées d'un en-tête `Accept-Language`, par qualité décroissante, réduites à leur langue
 * principale (`en-GB;q=0.8` -> `en`). Les valeurs mal formées sont ignorées.
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number(qParam.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0] ?? "", q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((entry) => /^[a-z]{2,3}$/.test(entry.lang) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.lang);
}

/**
 * Langue de l'interface : choix explicite (cookie) > langues du navigateur > français. Seules les langues
 * ACTIVÉES sont retenues ; le français l'est toujours, il sert donc de repli.
 */
export function resolveLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
  enabled?: readonly string[];
}): Locale {
  const enabled = new Set<string>(input.enabled ?? LOCALES);
  enabled.add(DEFAULT_LOCALE);
  const candidates = [input.cookie ?? "", ...parseAcceptLanguage(input.acceptLanguage)];
  const found = candidates.find((candidate) => isLocale(candidate) && enabled.has(candidate));
  return isLocale(found) ? found : DEFAULT_LOCALE;
}
