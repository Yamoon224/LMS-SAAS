import { useQuery } from "@tanstack/react-query";

import { fetchMediaStatus } from "../api/media.api";
import { isMediaSettled } from "../schemas/media.schema";

/** État d'un média, rafraîchi toutes les 3 s tant qu'il est en analyse ou en transcodage (ENT-24). */
export function useMediaStatus(mediaAssetId: string | null | undefined) {
  return useQuery({
    queryKey: ["media", mediaAssetId],
    queryFn: () => fetchMediaStatus(mediaAssetId as string),
    enabled: Boolean(mediaAssetId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && isMediaSettled(status) ? false : 3000;
    },
  });
}
