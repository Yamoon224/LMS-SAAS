import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setProviderConfig } from "../api/payments.api";
import type { SetProviderConfigValues } from "../schemas/payment-provider.schema";

import { paymentProvidersQueryKey } from "./usePaymentProviders";

/** ADM-20: configure (crée ou met à jour) un fournisseur de paiement. */
export function useSetProviderConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Fournisseur de paiement enregistré." },
    mutationFn: (values: SetProviderConfigValues) => setProviderConfig(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentProvidersQueryKey });
    },
  });
}
