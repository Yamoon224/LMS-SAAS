import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { acceptRefund, fetchRefunds, rejectRefund } from "../api/refunds.api";
import type { RejectRefundValues } from "../schemas/refund.schema";

const REFUNDS_KEY = ["refunds"] as const;

export function useRefunds() {
  return useQuery({ queryKey: REFUNDS_KEY, queryFn: fetchRefunds });
}

export function useAcceptRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Demande acceptée : l'administrateur va exécuter le remboursement." },
    mutationFn: ({ id, amount }: { id: string; amount?: number }) => acceptRefund(id, amount),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REFUNDS_KEY }),
  });
}

export function useRejectRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Demande refusée." },
    mutationFn: ({ id, values }: { id: string; values: RejectRefundValues }) => rejectRefund(id, values),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REFUNDS_KEY }),
  });
}
