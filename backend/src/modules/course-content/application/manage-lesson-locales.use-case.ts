import { Inject, Injectable } from "@nestjs/common";
import { sanitizeHtml } from "@shared/security/html-sanitizer";

import { LESSON_LOCALE_REPOSITORY } from "../domain/lesson-locale.repository.port";
import type { LessonLocaleRepositoryPort, LessonLocaleSummary } from "../domain/lesson-locale.repository.port";

export interface PublishedLessonLocale {
  title: string | null;
  /** Déjà assaini : le contenu traduit vient d'un fournisseur d'IA, jamais servi tel qu'enregistré. */
  contentHtml: string | null;
}

/**
 * PUB-17 : lecture et publication des traductions de leçons. La publication se fait par formation et par langue
 * (toutes les leçons traduites d'un coup), jamais leçon par leçon, pour qu'un apprenant ne voie pas une formation
 * à moitié basculée par une relecture inachevée.
 */
@Injectable()
export class ManageLessonLocalesUseCase {
  constructor(@Inject(LESSON_LOCALE_REPOSITORY) private readonly repository: LessonLocaleRepositoryPort) {}

  /** Traduction publiée d'une leçon, ou null (brouillon ou absente). Le HTML est assaini à chaque lecture. */
  async findPublished(lessonId: string, locale: string): Promise<PublishedLessonLocale | null> {
    const found = await this.repository.findPublished(lessonId, locale);
    if (!found) return null;
    return {
      title: found.title,
      // Idempotent : couvre aussi les lignes écrites avant que l'écriture n'assainisse.
      contentHtml: found.contentHtml ? sanitizeHtml(found.contentHtml) : null,
    };
  }

  /** Titres traduits publiés pour toutes les leçons d'une formation (une seule requête). */
  async listPublishedTitles(courseId: string, locale: string): Promise<Map<string, string>> {
    const rows = await this.repository.listPublishedTitles(courseId, locale);
    return new Map(rows.flatMap((row) => (row.title ? [[row.lessonId, row.title] as const] : [])));
  }

  /** Nombre de leçons traduites par langue et par statut. */
  summarize(courseId: string): Promise<LessonLocaleSummary[]> {
    return this.repository.summarizeByCourse(courseId);
  }

  /** Change le statut de toutes les traductions de leçons d'une formation pour une langue ; renvoie leur nombre. */
  setStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<number> {
    return this.repository.setStatusForCourse(courseId, locale, status);
  }
}
