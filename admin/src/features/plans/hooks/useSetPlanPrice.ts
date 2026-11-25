import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setPlanPrice } from "../api/plans.api";
import type { SetPlanPriceValues } from "../schemas/plan.schema";

import { plansQueryKey } from "./usePlans";

/**
 * ADM-17: ajoute une nouvelle version de prix à un plan. Ne modifie jamais
 * les abonnements existants — seules les nouvelles souscriptions utilisent
 * le nouveau prix (la version précédente reste figée sur les abonnements en
 * cours, cf. commentaire du use-case backend SetPlanPriceUseCase).
 */
export function useSetPlanPrice(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Nouvelle version de prix créée." },
    mutationFn: (values: SetPlanPriceValues) => setPlanPrice(planId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plansQueryKey });
    },
  });
}
