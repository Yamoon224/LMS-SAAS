/**
 * PUB-17 : langue de lecture du contenu d'une formation. Fonctions pures (section 13.1).
 *
 * L'apprenant peut lire une formation dans une langue traduite et publiée ; sa progression est commune à toutes les
 * langues (elle est rattachée à la leçon, jamais à la langue). Toute demande non satisfaisable retombe silencieusement
 * sur la langue d'origine : changer de langue ne doit jamais empêcher de suivre la formation.
 */

/**
 * Langue à appliquer, ou null pour rester dans la langue d'origine : rien demandé, langue d'origine redemandée, ou
 * langue qui n'est pas actuellement disponible (non publiée, retirée, ou désactivée sur la plateforme).
 */
export function resolveContentLocale(
  requested: string | undefined,
  sourceLocale: string,
  availableLocales: readonly string[],
): string | null {
  const wanted = requested?.trim();
  if (!wanted || wanted === sourceLocale) return null;
  return availableLocales.includes(wanted) ? wanted : null;
}

/** Langues proposées à l'apprenant : l'origine d'abord, puis les langues traduites disponibles, sans doublon. */
export function listAvailableLocales(sourceLocale: string, availableTranslated: readonly string[]): string[] {
  return [sourceLocale, ...new Set(availableTranslated.filter((locale) => locale !== sourceLocale))];
}

export interface LocalizableLesson {
  title: string;
  contentHtml: string | null;
}

/**
 * Texte d'une leçon dans la langue demandée. Un champ traduit vide ou absent retombe sur le texte d'origine, champ par
 * champ : un titre traduit sans contenu traduit ne doit pas afficher une leçon vide.
 */
export function localizeLesson(
  source: LocalizableLesson,
  translated: { title: string | null; contentHtml: string | null } | null,
): LocalizableLesson {
  if (!translated) return source;
  return {
    title: translated.title?.trim() ? translated.title : source.title,
    contentHtml: translated.contentHtml?.trim() ? translated.contentHtml : source.contentHtml,
  };
}
