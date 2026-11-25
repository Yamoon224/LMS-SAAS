import { useQuery } from "@tanstack/react-query";

import { fetchPlatformHealth } from "../api/platform-health.api";

/** Relu toutes les 30 secondes : une page de supervision doit refléter l'état courant sans rechargement. */
export const HEALTH_REFRESH_MS = 30_000;

export function usePlatformHealth() {
  return useQuery({
    queryKey: ["platform-health"],
    queryFn: fetchPlatformHealth,
    refetchInterval: HEALTH_REFRESH_MS,
    retry: (failureCount, error) => ((error as { status?: number }).status === 403 ? false : failureCount < 2),
  });
}
