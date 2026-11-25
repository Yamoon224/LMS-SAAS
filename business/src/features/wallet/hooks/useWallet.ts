import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchBalance, fetchPayouts, fetchTransactions, requestPayout } from "../api/wallet.api";

export const walletBalanceQueryKey = ["wallet", "balance"] as const;
export const walletPayoutsQueryKey = ["wallet", "payouts"] as const;

/** Solde en attente / disponible du tenant (ENT-69). */
export function useWalletBalance() {
  return useQuery({ queryKey: walletBalanceQueryKey, queryFn: fetchBalance });
}

/** Historique des reversements (ENT-69). */
export function usePayouts() {
  return useQuery({ queryKey: walletPayoutsQueryKey, queryFn: fetchPayouts });
}

/** Historique des ventes (ENT-68). */
export function useTransactions() {
  return useQuery({ queryKey: ["wallet", "transactions"], queryFn: fetchTransactions });
}

/** Demande de reversement: invalide le solde (le disponible est consommé) et l'historique. */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { successMessage: "Demande de reversement envoyée." },
    mutationFn: () => requestPayout(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
