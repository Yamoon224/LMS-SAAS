import { useQuery } from "@tanstack/react-query";

import { fetchCourses } from "../api/courses.api";

export const coursesQueryKey = ["courses"] as const;

/** Expose la liste des formations de l'entreprise via TanStack Query (ENT-15). */
export function useCourses() {
  return useQuery({
    queryKey: coursesQueryKey,
    queryFn: fetchCourses,
  });
}
