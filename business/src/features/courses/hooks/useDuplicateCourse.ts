import { useMutation, useQueryClient } from "@tanstack/react-query";

import { duplicateCourse } from "../api/courses.api";

import { coursesQueryKey } from "./useCourses";

/** Duplication d'une formation (ENT-20) + invalidation de la liste. */
export function useDuplicateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Formation dupliquée." },
    mutationFn: duplicateCourse,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coursesQueryKey });
    },
  });
}
