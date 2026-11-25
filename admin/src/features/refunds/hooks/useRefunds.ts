import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { executeRefund, fetchRefundsByStatus } from "../api/refunds.api";
import type { RefundStatus } from "../schemas/refund.schema";

export function useRefundsByStatus(status: RefundStatus) {
  return useQuery({ queryKey: ["refunds", status], queryFn: () => fetchRefundsByStatus(status) });
}

/** Une exécution fait passer la demande de « À rembourser » à « Remboursées » : on rafraîchit toutes les files. */
export function useExecuteRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Remboursement exécuté." },
    mutationFn: executeRefund,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["refunds"] }),
  });
}
