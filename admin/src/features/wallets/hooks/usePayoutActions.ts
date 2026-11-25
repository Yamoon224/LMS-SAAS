import { useMutation, useQueryClient } from "@tanstack/react-query";

import { approvePayout, executePayout, rejectPayout, validatePayout } from "../api/wallets.api";
import type { ExecutePayoutValues, RejectPayoutValues } from "../schemas/wallet.schema";

/**
 * Un reversement change de statut (donc de file) à chaque action : on
 * invalidate toutes les requêtes "wallets/payouts" plutôt qu'une seule clé
 * de statut, pour que la file source ET la file destination se rafraîchissent.
 */
function useInvalidatePayouts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["wallets", "payouts"] });
  };
}

/** ADM-24: première validation, par un opérateur. */
export function useValidatePayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: validatePayout,
    meta: { successMessage: "Reversement validé." },
    onSuccess: invalidate,
  });
}

/** ADM-24: seconde validation, par la finance (doit différer de l'opérateur). */
export function useApprovePayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: approvePayout,
    meta: { successMessage: "Reversement approuvé." },
    onSuccess: invalidate,
  });
}

export function useExecutePayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExecutePayoutValues }) => executePayout(id, values),
    meta: { successMessage: "Reversement exécuté." },
    onSuccess: invalidate,
  });
}

export function useRejectPayout() {
  const invalidate = useInvalidatePayouts();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: RejectPayoutValues }) => rejectPayout(id, values),
    meta: { successMessage: "Reversement rejeté." },
    onSuccess: invalidate,
  });
}
