import { DomainError } from "@shared/errors";

/**
 * PUB-17 : publication des traductions d'une formation. Fonctions pures (section 13.1).
 *
 * Une langue est publiée **pour toute la formation** (fiche + toutes les leçons traduites) ; la fiche de la
 * formation fait office de « porte » côté apprenant : une langue n'est proposée que si sa fiche est publiée.
 */

export class TranslationNotPublishableError extends DomainError {
  readonly code = "TRADUCTION_NON_PUBLIABLE";
}

export interface CourseLocaleView {
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  origin: "SOURCE" | "AI" | "MANUAL";
}

export interface TranslationOverview {
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  origin: "SOURCE" | "AI" | "MANUAL";
  lessonsTranslated: number;
  lessonsTotal: number;
  /** Part des leçons traduites (0 à 100) ; les leçons sans traduction s'afficheront dans la langue d'origine. */
  coveragePercent: number;
}

/** Une ligne par langue traduite de la formation, avec la couverture de ses leçons. */
export function buildTranslationOverview(
  sourceLocale: string,
  courseLocales: readonly CourseLocaleView[],
  translatedLessonsByLocale: ReadonlyMap<string, number>,
  lessonsTotal: number,
): TranslationOverview[] {
  return courseLocales
    .filter((entry) => entry.locale !== sourceLocale)
    .map((entry) => {
      const lessonsTranslated = Math.min(translatedLessonsByLocale.get(entry.locale) ?? 0, lessonsTotal);
      return {
        locale: entry.locale,
        status: entry.status,
        origin: entry.origin,
        lessonsTranslated,
        lessonsTotal,
        coveragePercent: lessonsTotal === 0 ? 0 : Math.round((lessonsTranslated / lessonsTotal) * 100),
      };
    })
    .sort((a, b) => a.locale.localeCompare(b.locale));
}

/**
 * Une langue ne peut être publiée que si elle n'est pas la langue d'origine, si la formation a une fiche pour cette
 * langue, et si au moins une leçon a été traduite (sinon l'apprenant verrait une formation entièrement dans l'autre langue).
 */
export function assertPublishable(
  sourceLocale: string,
  locale: string,
  hasCourseLocale: boolean,
  lessonsTranslated: number,
): void {
  if (locale === sourceLocale) {
    throw new TranslationNotPublishableError("La langue d'origine de la formation n'a pas à être publiée.");
  }
  if (!hasCourseLocale) {
    throw new TranslationNotPublishableError(`Aucune traduction « ${locale} » pour cette formation.`);
  }
  if (lessonsTranslated === 0) {
    throw new TranslationNotPublishableError(`Aucune leçon n'est traduite en « ${locale} » : rien à publier.`);
  }
}
