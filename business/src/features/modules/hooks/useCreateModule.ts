import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createModule } from "../api/modules.api";
import type { CreateModuleValues } from "../schemas/module.schema";

import { modulesQueryKey } from "./useModules";

/** Ajout d'un module (ENT-22) + invalidation de la liste. */
export function useCreateModule(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Module créé." },
    mutationFn: (values: CreateModuleValues) => createModule(courseId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modulesQueryKey(courseId) });
    },
  });
}
