import { z } from "zod";

/** GET /admin/analytics/ai-consumption (backend/.../analytics/domain/ai-consumption.ts). */
const tenantConsumptionSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string(),
  jobsCount: z.number(),
  completedJobs: z.number(),
  failedJobs: z.number(),
  creditsConsumed: z.number(),
  wordsTranslated: z.number(),
  providerCostEstimate: z.number().nullable(),
});
export type TenantAiConsumption = z.infer<typeof tenantConsumptionSchema>;

export const aiConsumptionSchema = z.object({
  tenants: tenantConsumptionSchema.array(),
  totals: z.object({
    jobsCount: z.number(),
    completedJobs: z.number(),
    failedJobs: z.number(),
    creditsConsumed: z.number(),
    wordsTranslated: z.number(),
    providerCostEstimate: z.number().nullable(),
    creditsValueEstimate: z.number().nullable(),
    marginEstimate: z.number().nullable(),
  }),
  providerCostPerWord: z.number().nullable(),
  averageCreditValue: z.number().nullable(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});
export type AiConsumption = z.infer<typeof aiConsumptionSchema>;
