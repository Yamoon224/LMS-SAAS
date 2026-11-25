import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteProvider } from "../api/payments.api";

import { paymentProvidersQueryKey } from "./usePaymentProviders";

/** ADM-20 : suppression d'un fournisseur de paiement (refusée par le serveur s'il a déjà traité des paiements). */
export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Fournisseur supprimé." },
    mutationFn: (code: string) => deleteProvider(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: paymentProvidersQueryKey });
    },
  });
}
