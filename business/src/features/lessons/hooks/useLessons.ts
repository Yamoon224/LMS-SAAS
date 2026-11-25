import { useQuery } from "@tanstack/react-query";

import { fetchLessons } from "../api/lessons.api";

export function lessonsQueryKey(moduleId: string) {
  return ["modules", moduleId, "lessons"] as const;
}

/** Expose la liste des leçons d'un module via TanStack Query. */
export function useLessons(moduleId: string) {
  return useQuery({
    queryKey: lessonsQueryKey(moduleId),
    queryFn: () => fetchLessons(moduleId),
    enabled: Boolean(moduleId),
  });
}
