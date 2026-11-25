import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reviseCommissionRule } from "../api/commission-rules.api";
import type { ReviseCommissionRuleValues } from "../schemas/commission-rule.schema";

import { commissionRulesQueryKey } from "./useCommissionRules";

/** ADM-15/ADM-16 : modification d'une règle (nouvelle version datée de maintenant ; l'ancienne reste dans l'historique). */
export function useReviseCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Règle de commission modifiée." },
    mutationFn: ({ id, values }: { id: string; values: ReviseCommissionRuleValues }) => reviseCommissionRule(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commissionRulesQueryKey });
    },
  });
}
