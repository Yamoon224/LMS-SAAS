import type { AuditEntryPage, AuditFiltersValues } from "../schemas/audit.schema";
import { auditEntryPageSchema, PAGE_SIZE } from "../schemas/audit.schema";

import { apiClient } from "@/lib/api-client";

export interface FetchAuditEntriesParams extends AuditFiltersValues {
  skip: number;
  /** Taille de page (backend : 1 à 200, défaut 50). */
  take?: number;
}

export async function fetchAuditEntries(params: FetchAuditEntriesParams): Promise<AuditEntryPage> {
  const search = new URLSearchParams();
  if (params.actorId) search.set("actorId", params.actorId);
  if (params.objectType) search.set("objectType", params.objectType);
  if (params.objectId) search.set("objectId", params.objectId);
  if (params.action) search.set("action", params.action);
  if (params.from) search.set("from", new Date(params.from).toISOString());
  if (params.to) search.set("to", new Date(params.to).toISOString());
  search.set("take", String(params.take ?? PAGE_SIZE));
  search.set("skip", String(params.skip));

  const data = await apiClient.get<unknown>(`/admin/audit?${search.toString()}`);
  return auditEntryPageSchema.parse(data);
}
