import { z } from "zod";

export const auditEntrySchema = z
  .object({
    id: z.string(),
    tenantId: z.string().nullable(),
    actorId: z.string().nullable(),
    action: z.string(),
    objectType: z.string(),
    objectId: z.string().nullable(),
    createdAt: z.coerce.date(),
  })
  .passthrough();
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditEntryPageSchema = z.object({
  total: z.number(),
  entries: z.array(auditEntrySchema),
});
export type AuditEntryPage = z.infer<typeof auditEntryPageSchema>;

/** Doit rester cohérent avec ListAuditEntriesDto. */
export const auditFiltersSchema = z.object({
  actorId: z.string().optional().or(z.literal("")),
  objectType: z.string().optional().or(z.literal("")),
  objectId: z.string().optional().or(z.literal("")),
  action: z.string().optional().or(z.literal("")),
  from: z.string().optional().or(z.literal("")),
  to: z.string().optional().or(z.literal("")),
});
export type AuditFiltersValues = z.infer<typeof auditFiltersSchema>;

export const PAGE_SIZE = 50;
