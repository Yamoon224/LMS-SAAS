import { useQuery } from "@tanstack/react-query";

import { fetchPayoutsByStatus } from "../api/wallets.api";
import type { PayoutStatus } from "../schemas/wallet.schema";

export const payoutsQueryKey = (status: PayoutStatus) => ["wallets", "payouts", status] as const;

/** File des reversements pour un statut donné (ADM-24). */
export function usePayoutsByStatus(status: PayoutStatus) {
  return useQuery({
    queryKey: payoutsQueryKey(status),
    queryFn: () => fetchPayoutsByStatus(status),
  });
}
