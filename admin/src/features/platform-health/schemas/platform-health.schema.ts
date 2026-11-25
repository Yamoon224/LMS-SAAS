import { z } from "zod";

/** GET /admin/health (backend/.../analytics/domain/platform-health.ts). */
export const healthStatusSchema = z.enum(["HEALTHY", "DEGRADED", "DOWN", "NO_DATA"]);
export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  HEALTHY: "Normal",
  DEGRADED: "Dégradé",
  DOWN: "Arrêté",
  NO_DATA: "Aucune donnée",
};

export const platformHealthSchema = z.object({
  generatedAt: z.coerce.date(),
  overall: healthStatusSchema,
  queues: z
    .object({
      name: z.string(),
      available: z.boolean(),
      counts: z
        .object({
          waiting: z.number(),
          active: z.number(),
          delayed: z.number(),
          failed: z.number(),
          paused: z.number(),
        })
        .nullable(),
      status: healthStatusSchema,
    })
    .array(),
  webhooks: z.object({
    windowHours: z.number(),
    total: z.number(),
    failed: z.number(),
    errorRatePercent: z.number(),
    status: healthStatusSchema,
    providers: z
      .object({
        providerCode: z.string(),
        total: z.number(),
        failed: z.number(),
        errorRatePercent: z.number(),
        status: healthStatusSchema,
      })
      .array(),
  }),
  storage: z.object({
    totalBytes: z.number(),
    assetsCount: z.number(),
    tenantsCount: z.number(),
    topTenants: z
      .object({ tenantId: z.string(), tenantName: z.string(), bytes: z.number(), assets: z.number() })
      .array(),
  }),
});
export type PlatformHealth = z.infer<typeof platformHealthSchema>;

const UNITS = ["o", "Ko", "Mo", "Go", "To"] as const;

/** Taille lisible (base 1024) : 1536 → « 1,5 Ko ». */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 o";
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const text = exponent === 0 ? String(Math.round(value)) : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  return `${text} ${UNITS[exponent]}`;
}
