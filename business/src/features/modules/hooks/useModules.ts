import { useQuery } from "@tanstack/react-query";

import { fetchModules } from "../api/modules.api";

export function modulesQueryKey(courseId: string) {
  return ["courses", courseId, "modules"] as const;
}

/** Expose la liste des modules d'une formation via TanStack Query (ENT-22). */
export function useModules(courseId: string) {
  return useQuery({
    queryKey: modulesQueryKey(courseId),
    queryFn: () => fetchModules(courseId),
    enabled: Boolean(courseId),
  });
}
