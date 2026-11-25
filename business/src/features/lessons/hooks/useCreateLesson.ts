import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createLesson } from "../api/lessons.api";
import type { CreateLessonValues } from "../schemas/lesson.schema";

import { lessonsQueryKey } from "./useLessons";

/** Ajout d'une leçon (ENT-23/ENT-24) + invalidation de la liste. */
export function useCreateLesson(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Leçon créée." },
    mutationFn: (values: CreateLessonValues) => createLesson(moduleId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonsQueryKey(moduleId) });
    },
  });
}
