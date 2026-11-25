import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reorderModules } from "../api/modules.api";

import { modulesQueryKey } from "./useModules";

/** Réordonnancement des modules (ENT-22) + invalidation de la liste. */
export function useReorderModules(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { silent: true },
    mutationFn: (orderedIds: string[]) => reorderModules(courseId, orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modulesQueryKey(courseId) });
    },
  });
}
