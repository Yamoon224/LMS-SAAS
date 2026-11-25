import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updatePlan } from "../api/plans.api";
import type { UpdatePlanPayload } from "../api/plans.api";

import { plansQueryKey } from "./usePlans";

/** ADM-13 : modification nom / description / quotas / fonctionnalités (le prix reste versionné à part). */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Plan mis à jour." },
    mutationFn: (payload: UpdatePlanPayload) => updatePlan(planId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKey });
    },
  });
}
