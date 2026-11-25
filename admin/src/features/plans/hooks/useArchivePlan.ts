import { useMutation, useQueryClient } from "@tanstack/react-query";

import { archivePlan } from "../api/plans.api";

import { plansQueryKey } from "./usePlans";

/** Archivage d'un plan (ADM-13) : les abonnements en cours ne sont pas affectés. */
export function useArchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Plan archivé." },
    mutationFn: archivePlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKey });
    },
  });
}
