import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchAuditEntries } from "../api/audit.api";
import type { AuditFilters } from "../schemas/audit.schema";

/** Journal d'audit paginé ; conserve la page précédente pendant le changement de page/filtre. */
export function useAuditEntries(filters: AuditFilters, take: number, skip: number) {
  return useQuery({
    queryKey: ["business-audit", filters, take, skip] as const,
    queryFn: () => fetchAuditEntries(filters, take, skip),
    placeholderData: keepPreviousData,
  });
}
