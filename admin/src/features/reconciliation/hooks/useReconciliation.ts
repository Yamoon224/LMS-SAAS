import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchReconciliationOverview, refundDuplicate, replayWebhook } from "../api/reconciliation.api";

const RECONCILIATION_KEY = ["reconciliation"] as const;

export function useReconciliationOverview() {
  return useQuery({ queryKey: RECONCILIATION_KEY, queryFn: fetchReconciliationOverview });
}

export function useReplayWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    // Le message dépend de l'issue (traité / déjà traité / toujours inconnu) : affiché par l'écran.
    meta: { silent: true },
    mutationFn: replayWebhook,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: RECONCILIATION_KEY }),
  });
}

export function useRefundDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Doublon remboursé." },
    mutationFn: refundDuplicate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECONCILIATION_KEY });
      void queryClient.invalidateQueries({ queryKey: ["refunds"] });
    },
  });
}
