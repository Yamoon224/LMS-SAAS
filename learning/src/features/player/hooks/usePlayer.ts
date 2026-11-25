"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchCourseContent, fetchCourseLocales, fetchLesson } from "../api/player.api";

import { useContentLocale } from "./useContentLocale";

// Les clés commencent par ces préfixes : invalider `courseContentKey(id)` ou `lessonKey(id, lessonId)` vise toutes les langues.
export const courseContentKey = (enrollmentId: string) => ["course-content", enrollmentId] as const;
export const lessonKey = (enrollmentId: string, lessonId: string) => ["lesson", enrollmentId, lessonId] as const;
export const courseLocalesKey = (enrollmentId: string) => ["course-locales", enrollmentId] as const;

export function useCourseContent(enrollmentId: string) {
  const [locale] = useContentLocale(enrollmentId);
  return useQuery({
    queryKey: [...courseContentKey(enrollmentId), locale ?? ""],
    queryFn: () => fetchCourseContent(enrollmentId, locale),
    staleTime: 30_000,
  });
}

export function useLesson(enrollmentId: string, lessonId: string) {
  const [locale] = useContentLocale(enrollmentId);
  return useQuery({
    queryKey: [...lessonKey(enrollmentId, lessonId), locale ?? ""],
    queryFn: () => fetchLesson(enrollmentId, lessonId, locale),
    // Les URL signées de média expirent : on évite de servir une leçon en cache trop ancienne.
    staleTime: 60_000,
    retry: false,
  });
}

/** PUB-17 : langues dans lesquelles lire la formation ; en cas d'échec le sélecteur reste simplement masqué. */
export function useCourseLocales(enrollmentId: string) {
  return useQuery({
    queryKey: courseLocalesKey(enrollmentId),
    queryFn: () => fetchCourseLocales(enrollmentId),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
