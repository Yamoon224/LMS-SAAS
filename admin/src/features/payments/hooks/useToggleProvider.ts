import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toggleProvider } from "../api/payments.api";

import { paymentProvidersQueryKey } from "./usePaymentProviders";

/** ADM-20: active/désactive un fournisseur de paiement déjà configuré. */
export function useToggleProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Fournisseur mis à jour." },
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      toggleProvider(code, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentProvidersQueryKey });
    },
  });
}
