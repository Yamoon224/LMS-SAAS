import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { FetchAuditEntriesParams } from "../api/audit.api";
import { fetchAuditEntries } from "../api/audit.api";

export const auditEntriesQueryKey = (params: FetchAuditEntriesParams) =>
  ["audit-entries", params] as const;

/** Journal d'audit plateforme, filtré et paginé (RG-19). */
export function useAuditEntries(params: FetchAuditEntriesParams) {
  return useQuery({
    queryKey: auditEntriesQueryKey(params),
    queryFn: () => fetchAuditEntries(params),
    placeholderData: keepPreviousData,
  });
}
