import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCourse } from "../api/courses.api";
import type { UpdateCourseValues } from "../schemas/course.schema";

import { courseQueryKey } from "./useCourse";
import { coursesQueryKey } from "./useCourses";

/** Modification d'une formation (ENT-15/ENT-21) + invalidation liste + fiche. */
export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Formation mise à jour." },
    mutationFn: (values: UpdateCourseValues) => updateCourse(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: coursesQueryKey });
      void queryClient.invalidateQueries({ queryKey: courseQueryKey(id) });
    },
  });
}
