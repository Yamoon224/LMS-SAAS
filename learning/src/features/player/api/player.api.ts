import { courseContentSchema, courseLocalesSchema, lessonSchema } from "../schemas/player.schema";
import type { CourseContent, CourseLocales, Lesson } from "../schemas/player.schema";

import { apiClient } from "@/lib/api-client";

const enc = encodeURIComponent;

/** `?locale=` n'est ajouté que pour une langue choisie : sans lui, le serveur sert la langue d'origine. */
function withLocale(path: string, locale: string | undefined): string {
  return locale ? `${path}?locale=${enc(locale)}` : path;
}

export async function fetchCourseContent(enrollmentId: string, locale?: string): Promise<CourseContent> {
  return courseContentSchema.parse(
    await apiClient.get<unknown>(withLocale(`/public/enrollments/${enc(enrollmentId)}/course-content`, locale)),
  );
}

/** PUB-17 : langues disponibles pour cette formation. */
export async function fetchCourseLocales(enrollmentId: string): Promise<CourseLocales> {
  return courseLocalesSchema.parse(await apiClient.get<unknown>(`/public/enrollments/${enc(enrollmentId)}/locales`));
}

export async function fetchLesson(enrollmentId: string, lessonId: string, locale?: string): Promise<Lesson> {
  return lessonSchema.parse(
    await apiClient.get<unknown>(
      withLocale(`/public/enrollments/${enc(enrollmentId)}/lessons/${enc(lessonId)}`, locale),
    ),
  );
}

/** Suivi de consultation : `watchedPercent` (0-100) pour vidéo/audio, absent pour une simple ouverture. */
export async function recordLessonView(enrollmentId: string, lessonId: string, watchedPercent?: number): Promise<void> {
  await apiClient.post(
    `/public/enrollments/${enc(enrollmentId)}/lessons/${enc(lessonId)}/view`,
    watchedPercent === undefined ? {} : { watchedPercent: Math.max(0, Math.min(100, Math.round(watchedPercent))) },
  );
}
