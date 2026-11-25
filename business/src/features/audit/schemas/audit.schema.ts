import { z } from "zod";

/** GET /business/audit : { total, entries[] } (ListAuditEntriesDto : take ≤ 200, skip). */
export const auditEntrySchema = z.object({
  id: z.string(),
  actorId: z.string().nullish(),
  action: z.string(),
  objectType: z.string(),
  objectId: z.string().nullish(),
  createdAt: z.coerce.date(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditPageSchema = z.object({
  total: z.number(),
  entries: z.array(auditEntrySchema),
});
export type AuditPage = z.infer<typeof auditPageSchema>;

export interface AuditFilters {
  action: string;
  objectType: string;
  /** YYYY-MM-DD (jour local), vide = non filtré. */
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = { action: "", objectType: "", from: "", to: "" };

export const AUDIT_PAGE_SIZE = 25;
