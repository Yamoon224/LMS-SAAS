import type { CourseContent, OutlineLesson, OutlineModule } from "../schemas/player.schema";

export interface FlatLesson extends OutlineLesson {
  moduleId: string;
  moduleTitle: string;
  moduleIndex: number;
  accessible: boolean;
}

/** Liste plate des leçons dans l'ordre module puis leçon. */
export function flattenLessons(content: CourseContent): FlatLesson[] {
  return [...content.modules]
    .sort((a, b) => a.order - b.order)
    .flatMap((mod, moduleIndex) =>
      [...mod.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson) => ({
          ...lesson,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleIndex,
          accessible: mod.accessible,
        })),
    );
}

export function sortedModules(content: CourseContent): OutlineModule[] {
  return [...content.modules].sort((a, b) => a.order - b.order);
}

/** Première leçon accessible non terminée, sinon la première accessible. */
export function pickResumeLesson(lessons: FlatLesson[]): FlatLesson | undefined {
  const accessible = lessons.filter((lesson) => lesson.accessible);
  return accessible.find((lesson) => !lesson.completed) ?? accessible[0];
}

/** Voisines accessibles (les leçons verrouillées sont sautées). */
export function neighbours(lessons: FlatLesson[], lessonId: string): { previous?: FlatLesson; next?: FlatLesson } {
  const accessible = lessons.filter((lesson) => lesson.accessible);
  const index = accessible.findIndex((lesson) => lesson.id === lessonId);
  if (index === -1) return {};
  return { previous: accessible[index - 1], next: accessible[index + 1] };
}
