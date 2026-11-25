import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removeLessonMedia } from "../api/lessons.api";

import { lessonQueryKey } from "./useLesson";

/** Retrait du fichier d'une leçon (ENT-24) : libère le stockage du plan. */
export function useRemoveLessonMedia(moduleId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Fichier supprimé." },
    mutationFn: () => removeLessonMedia(moduleId, lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: lessonQueryKey(moduleId, lessonId) });
    },
  });
}
