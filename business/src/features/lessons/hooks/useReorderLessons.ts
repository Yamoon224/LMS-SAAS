import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderLessons } from "../api/lessons.api";

import { lessonsQueryKey } from "./useLessons";

/** Réordonnancement des leçons (ENT-22) + invalidation de la liste. */
export function useReorderLessons(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { silent: true },
    mutationFn: (orderedIds: string[]) => reorderLessons(moduleId, orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonsQueryKey(moduleId) });
    },
  });
}
