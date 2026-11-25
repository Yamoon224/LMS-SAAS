export interface UpsertLessonLocaleData {
  lessonId: string;
  locale: string;
  title: string | null;
  contentHtml: string | null;
  origin: "SOURCE" | "AI" | "MANUAL";
}

/** Nombre de leçons traduites d'une formation, par langue et par statut. */
export interface LessonLocaleSummary {
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  count: number;
}

/**
 * Port (abstraction) que l'infrastructure (Prisma) doit implémenter.
 * ENT-46: contenu pédagogique d'une leçon traduit — propriété du module
 * course-content (son schéma LessonLocale référence Lesson), mais rempli
 * exclusivement par le module ai-translation via CourseContentFacade.
 */
export interface LessonLocaleRepositoryPort {
  findByLessonAndLocale(lessonId: string, locale: string): Promise<{ title: string | null; contentHtml: string | null } | null>;
  /** DRAFT par défaut — la publication (passage à PUBLISHED) est une action du gestionnaire (PUB-17). */
  upsert(data: UpsertLessonLocaleData): Promise<void>;
  /** Traduction PUBLIÉE uniquement ; un brouillon n'est jamais renvoyé. */
  findPublished(lessonId: string, locale: string): Promise<{ title: string | null; contentHtml: string | null } | null>;
  /** Titres traduits publiés des leçons d'une formation, pour la langue demandée. */
  listPublishedTitles(courseId: string, locale: string): Promise<{ lessonId: string; title: string | null }[]>;
  summarizeByCourse(courseId: string): Promise<LessonLocaleSummary[]>;
  /** Change le statut des traductions de toutes les leçons d'une formation pour une langue ; renvoie leur nombre. */
  setStatusForCourse(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<number>;
}

export const LESSON_LOCALE_REPOSITORY = Symbol("LESSON_LOCALE_REPOSITORY");
