import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCreditPack } from "../api/credit-packs.api";

import { creditPacksQueryKey } from "./useCreditPacks";

/** Création d'un pack de crédits IA (ADM-18) + invalidation de la liste. */
export function useCreateCreditPack() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Pack de crédits créé." },
    mutationFn: createCreditPack,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creditPacksQueryKey });
    },
  });
}
