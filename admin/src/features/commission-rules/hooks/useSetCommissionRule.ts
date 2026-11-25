import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setCommissionRule } from "../api/commission-rules.api";

import { commissionRulesQueryKey } from "./useCommissionRules";

/**
 * ADM-15/ADM-16: définit une règle de commission. Une règle existante n'est
 * jamais modifiée — chaque appel crée une nouvelle règle avec sa propre date
 * de début (les taux déjà appliqués sur des ventes passées restent figés).
 */
export function useSetCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Règle de commission créée." },
    mutationFn: setCommissionRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commissionRulesQueryKey });
    },
  });
}
