import { auditPageSchema } from "../schemas/audit.schema";
import type { AuditFilters, AuditPage } from "../schemas/audit.schema";

import { apiClient } from "@/lib/api-client";

/** GET /business/audit (RG-19) avec filtres et pagination take/skip. */
export async function fetchAuditEntries(
  filters: AuditFilters,
  take: number,
  skip: number,
): Promise<AuditPage> {
  const params = new URLSearchParams({ take: String(take), skip: String(skip) });
  if (filters.action.trim()) params.set("action", filters.action.trim());
  if (filters.objectType.trim()) params.set("objectType", filters.objectType.trim());
  if (filters.from) params.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) params.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
  const data = await apiClient.get<unknown>(`/business/audit?${params.toString()}`);
  return auditPageSchema.parse(data);
}
