import { useQuery } from "@tanstack/react-query";

import { fetchPaymentProviders } from "../api/payments.api";

export const paymentProvidersQueryKey = ["payment-providers"] as const;

/** ADM-20: liste des fournisseurs de paiement configurés. */
export function usePaymentProviders() {
  return useQuery({
    queryKey: paymentProvidersQueryKey,
    queryFn: fetchPaymentProviders,
  });
}
