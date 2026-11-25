import type { Lesson } from "./lesson.entity";
import type { CompletionCriteria, ResourceType } from "./resource-type";

export interface CreateLessonData {
  moduleId: string;
  title: string;
  contentHtml?: string;
  resourceType: ResourceType;
  storageUrl?: string;
  isMandatory: boolean;
  completionCriteria?: CompletionCriteria;
  downloadAllowed: boolean;
  order: number;
}

export interface UpdateLessonData {
  title?: string;
  contentHtml?: string;
  /** null : retire la ressource de la leçon. */
  storageUrl?: string | null;
  isMandatory?: boolean;
  completionCriteria?: CompletionCriteria;
  downloadAllowed?: boolean;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface LessonRepositoryPort {
  findById(id: string): Promise<Lesson | null>;
  listByModule(moduleId: string): Promise<Lesson[]>;
  create(data: CreateLessonData): Promise<Lesson>;
  update(id: string, data: UpdateLessonData): Promise<void>;
  delete(id: string): Promise<void>;
  /** ENT-22/ENT-23: glisser-déposer — réordonne toutes les leçons d'un module en une transaction. */
  reorder(moduleId: string, orderedLessonIds: string[]): Promise<void>;
  nextOrder(moduleId: string): Promise<number>;
}

export const LESSON_REPOSITORY = Symbol("LESSON_REPOSITORY");
