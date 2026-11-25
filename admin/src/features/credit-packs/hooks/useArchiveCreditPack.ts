import { useMutation, useQueryClient } from "@tanstack/react-query";

import { archiveCreditPack } from "../api/credit-packs.api";

import { creditPacksQueryKey } from "./useCreditPacks";

/** Archivage d'un pack de crédits IA (ADM-18) : n'affecte pas les crédits déjà achetés. */
export function useArchiveCreditPack() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { successMessage: "Pack de crédits archivé." },
    mutationFn: archiveCreditPack,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: creditPacksQueryKey });
    },
  });
}
