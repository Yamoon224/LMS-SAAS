import { sanitizeHtml } from "@shared/security/html-sanitizer";

/**
 * Value object garantissant qu'aucun contenu HTML de leçon ne peut exister
 * dans le domaine sans être passé par le nettoyage liste blanche (BE-09,
 * ENT-23). Le nettoyage a lieu une seule fois, à la création — pas besoin
 * de le refaire à chaque lecture.
 */
export class LessonContent {
  private constructor(public readonly html: string) {}

  static create(rawHtml: string): LessonContent {
    return new LessonContent(sanitizeHtml(rawHtml));
  }

  /** Reconstruction depuis la persistance : déjà nettoyé à l'écriture, aucun nouveau nettoyage nécessaire. */
  static fromPersistence(cleanHtml: string): LessonContent {
    return new LessonContent(cleanHtml);
  }

  toString(): string {
    return this.html;
  }
}
