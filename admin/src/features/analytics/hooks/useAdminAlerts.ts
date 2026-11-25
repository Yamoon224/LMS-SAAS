import { useQuery } from "@tanstack/react-query";

import { fetchAdminAlerts } from "../api/alerts.api";

export const adminAlertsQueryKey = ["analytics", "alerts"] as const;

/** Alertes plateforme (ADM-03) ; rafraîchies chaque minute tant que le tableau de bord est ouvert. */
export function useAdminAlerts(enabled = true) {
  return useQuery({
    queryKey: adminAlertsQueryKey,
    queryFn: fetchAdminAlerts,
    enabled,
    refetchInterval: 60_000,
    retry: (failureCount, error) => ((error as { status?: number }).status === 403 ? false : failureCount < 2),
  });
}
