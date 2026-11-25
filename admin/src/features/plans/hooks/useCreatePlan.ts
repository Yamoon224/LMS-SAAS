import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPlan } from "../api/plans.api";

import { plansQueryKey } from "./usePlans";

/** Création d'un plan tarifaire (ADM-13/ADM-14) + invalidation de la liste. */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Plan créé." },
    mutationFn: createPlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKey });
    },
  });
}
