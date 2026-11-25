import { useQuery } from "@tanstack/react-query";

import { fetchCreditPacks } from "../api/credit-packs.api";

export const creditPacksQueryKey = ["credit-packs"] as const;

/** Liste des packs de crédits IA (ADM-18), archivés inclus. */
export function useCreditPacks() {
  return useQuery({
    queryKey: creditPacksQueryKey,
    queryFn: fetchCreditPacks,
  });
}
