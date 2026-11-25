import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteModule } from "../api/modules.api";

import { modulesQueryKey } from "./useModules";

/** Suppression d'un module (ENT-22) + invalidation de la liste. */
export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Module supprimé." },
    mutationFn: (moduleId: string) => deleteModule(courseId, moduleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modulesQueryKey(courseId) });
    },
  });
}
