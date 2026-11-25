import { z } from "zod";

/** GET /public/enrollments/:id/course-content (sans contenu des leçons). */
export const outlineLessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  resourceType: z.string(),
  isMandatory: z.boolean(),
  completed: z.boolean(),
});
export type OutlineLesson = z.infer<typeof outlineLessonSchema>;

export const outlineModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  accessible: z.boolean(),
  validated: z.boolean(),
  lessons: z.array(outlineLessonSchema),
});
export type OutlineModule = z.infer<typeof outlineModuleSchema>;

export const courseContentSchema = z.object({
  enrollmentId: z.string(),
  courseId: z.string(),
  progressionMode: z.string(),
  /** Langue des titres de leçons renvoyés (origine, ou traduction demandée si elle est lisible). */
  contentLocale: z.string().default(""),
  modules: z.array(outlineModuleSchema),
});
export type CourseContent = z.infer<typeof courseContentSchema>;

/** GET /public/enrollments/:id/lessons/:lessonId */
export const lessonSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  order: z.number(),
  resourceType: z.string(),
  isMandatory: z.boolean(),
  completionCriteria: z
    .object({ watchedPercent: z.number().optional(), requiresOpen: z.boolean().optional() })
    .nullish(),
  downloadAllowed: z.boolean(),
  contentHtml: z.string().nullish(),
  /** Langue réellement servie pour le titre et le contenu (origine si la traduction n'est pas lisible). */
  contentLocale: z.string().default(""),
  resource: z
    .object({
      kind: z.enum(["MEDIA", "EXTERNAL"]),
      url: z.string(),
      expiresAt: z.string().nullish(),
    })
    .nullish(),
  progress: z
    .object({ state: z.string(), watchedPercent: z.number().nullish(), opened: z.boolean().nullish() })
    .nullish(),
});
export type Lesson = z.infer<typeof lessonSchema>;

/** GET /public/enrollments/:id/locales — langues dans lesquelles lire la formation (PUB-17). */
export const courseLocalesSchema = z.object({
  sourceLocale: z.string(),
  /** Langue d'origine d'abord, puis les traductions publiées et activées. */
  available: z.array(z.string()),
});
export type CourseLocales = z.infer<typeof courseLocalesSchema>;
