import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateModule } from "../api/modules.api";
import type { UpdateModuleValues } from "../schemas/module.schema";

import { modulesQueryKey } from "./useModules";

/** Modification d'un module (ENT-22) + invalidation de la liste. */
export function useUpdateModule(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Module mis à jour." },
    mutationFn: ({ moduleId, values }: { moduleId: string; values: UpdateModuleValues }) =>
      updateModule(courseId, moduleId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: modulesQueryKey(courseId) });
    },
  });
}
