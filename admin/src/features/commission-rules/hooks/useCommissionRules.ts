import { useQuery } from "@tanstack/react-query";

import { fetchCommissionRules } from "../api/commission-rules.api";

export const commissionRulesQueryKey = ["commission-rules"] as const;

/** Liste des règles de commission définies (ADM-15/ADM-16). */
export function useCommissionRules() {
  return useQuery({
    queryKey: commissionRulesQueryKey,
    queryFn: fetchCommissionRules,
  });
}
