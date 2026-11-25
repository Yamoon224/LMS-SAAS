import { useQuery } from "@tanstack/react-query";

import { fetchLesson } from "../api/lessons.api";

export function lessonQueryKey(moduleId: string, lessonId: string) {
  return ["modules", moduleId, "lessons", lessonId] as const;
}

/** Fiche d'une leçon pour l'édition (contenu, critère de consultation, média rattaché). */
export function useLesson(moduleId: string, lessonId: string | null) {
  return useQuery({
    queryKey: lessonQueryKey(moduleId, lessonId ?? ""),
    queryFn: () => fetchLesson(moduleId, lessonId as string),
    enabled: Boolean(moduleId && lessonId),
    staleTime: 0,
  });
}
