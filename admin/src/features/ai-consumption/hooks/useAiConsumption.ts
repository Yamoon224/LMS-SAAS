import { useQuery } from "@tanstack/react-query";

import { fetchAiConsumption } from "../api/ai-consumption.api";

export function useAiConsumption(filters: { from: string; to: string }) {
  return useQuery({
    queryKey: ["analytics", "ai-consumption", filters],
    queryFn: () => fetchAiConsumption(filters),
    retry: (failureCount, error) => ((error as { status?: number }).status === 403 ? false : failureCount < 2),
  });
}
