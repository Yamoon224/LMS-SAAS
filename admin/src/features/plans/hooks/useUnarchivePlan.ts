import { useMutation, useQueryClient } from "@tanstack/react-query";

import { unarchivePlan } from "../api/plans.api";

import { plansQueryKey } from "./usePlans";

/** Désarchivage d'un plan (ADM-13) : il redevient souscriptible. */
export function useUnarchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Plan désarchivé : il peut de nouveau être souscrit." },
    mutationFn: unarchivePlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKey });
    },
  });
}
