import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCourse } from "../api/courses.api";

import { coursesQueryKey } from "./useCourses";

/** Création d'une formation (ENT-15, en Brouillon) + invalidation de la liste. */
export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Formation créée." },
    mutationFn: createCourse,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coursesQueryKey });
    },
  });
}
