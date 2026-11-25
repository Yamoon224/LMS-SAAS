import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteLesson } from "../api/lessons.api";

import { lessonsQueryKey } from "./useLessons";

/** Suppression d'une leçon + invalidation de la liste. */
export function useDeleteLesson(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Leçon supprimée." },
    mutationFn: (lessonId: string) => deleteLesson(moduleId, lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonsQueryKey(moduleId) });
    },
  });
}
