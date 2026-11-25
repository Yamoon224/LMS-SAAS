import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateLesson } from "../api/lessons.api";
import type { UpdateLessonValues } from "../schemas/lesson.schema";

import { lessonsQueryKey } from "./useLessons";

/** Modification d'une leçon (ENT-23/ENT-25) + invalidation de la liste. */
export function useUpdateLesson(moduleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Leçon mise à jour." },
    mutationFn: ({ lessonId, values }: { lessonId: string; values: UpdateLessonValues }) =>
      updateLesson(moduleId, lessonId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonsQueryKey(moduleId) });
    },
  });
}
