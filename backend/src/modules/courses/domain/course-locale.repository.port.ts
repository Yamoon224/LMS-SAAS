export interface UpsertCourseLocaleData {
  courseId: string;
  locale: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  origin: "SOURCE" | "AI" | "MANUAL";
}

/** Fiche traduite d'une formation, sans son contenu (liste des langues disponibles). */
export interface CourseLocaleInfo {
  locale: string;
  status: "DRAFT" | "PUBLISHED";
  origin: "SOURCE" | "AI" | "MANUAL";
}

/**
 * Port (abstraction) que l'infrastructure (Prisma) doit implémenter.
 * ENT-46: fiche formation traduite — rempli exclusivement par le module
 * ai-translation via CoursesFacade.
 */
export interface CourseLocaleRepositoryPort {
  /** Crée la fiche en DRAFT ; une retraduction remplace le texte et repasse en DRAFT pour être relue (PUB-17). */
  upsert(data: UpsertCourseLocaleData): Promise<void>;
  listByCourse(courseId: string): Promise<CourseLocaleInfo[]>;
  /** PUB-02/PUB-03 : langues des fiches PUBLIÉES de plusieurs formations, en une requête. */
  listPublishedLocalesByCourses(courseIds: string[]): Promise<Map<string, string[]>>;
  /** Change le statut de la fiche d'une langue ; renvoie false si cette langue n'existe pas pour la formation. */
  setStatus(courseId: string, locale: string, status: "DRAFT" | "PUBLISHED"): Promise<boolean>;
}

export const COURSE_LOCALE_REPOSITORY = Symbol("COURSE_LOCALE_REPOSITORY");
