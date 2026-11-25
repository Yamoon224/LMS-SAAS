import { useQuery } from "@tanstack/react-query";

import { fetchCourseById } from "../api/courses.api";

export function courseQueryKey(id: string) {
  return ["courses", id] as const;
}

/** Expose la fiche d'une formation via TanStack Query. */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseQueryKey(id),
    queryFn: () => fetchCourseById(id),
    enabled: Boolean(id),
  });
}
