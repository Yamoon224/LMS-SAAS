import { useMutation, useQueryClient } from "@tanstack/react-query";

import { archiveCourse, hideCourse, publishCourse } from "../api/courses.api";

import { courseQueryKey } from "./useCourse";
import { coursesQueryKey } from "./useCourses";

/** Changements de statut (ENT-18: publier/masquer/archiver) + invalidation liste + fiche. */
export function useChangeCourseStatus(id: string) {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: coursesQueryKey });
    void queryClient.invalidateQueries({ queryKey: courseQueryKey(id) });
  }

  const publish = useMutation({
    meta: { successMessage: "Formation publiée." },
    mutationFn: () => publishCourse(id),
    onSuccess: invalidate,
  });

  const hide = useMutation({
    meta: { successMessage: "Formation masquée." },
    mutationFn: () => hideCourse(id),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    meta: { successMessage: "Formation archivée." },
    mutationFn: () => archiveCourse(id),
    onSuccess: invalidate,
  });

  return { publish, hide, archive };
}
