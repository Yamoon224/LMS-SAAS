import { z } from "zod";

/** Doit rester cohérent avec ExtendSubscriptionDto / ApplyDiscountDto / OfferPlanDto (backend, module subscriptions). */

export const extendSubscriptionSchema = z
  .object({
    mode: z.enum(["days", "date"]),
    days: z.coerce.number().int().min(1, "Au moins 1 jour.").max(366, "366 jours au maximum.").optional(),
    until: z.string().optional(),
    reason: z.string().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "days" && value.days === undefined) {
      ctx.addIssue({ code: "custom", path: ["days"], message: "Indiquez un nombre de jours." });
    }
    if (value.mode === "date" && !value.until) {
      ctx.addIssue({ code: "custom", path: ["until"], message: "Choisissez une date." });
    }
  });
export type ExtendSubscriptionValues = z.infer<typeof extendSubscriptionSchema>;

export interface ExtendSubscriptionPayload {
  days?: number;
  until?: string;
  reason?: string;
}

export function buildExtendPayload(values: ExtendSubscriptionValues): ExtendSubscriptionPayload {
  const reason = values.reason?.trim() || undefined;
  if (values.mode === "days") return { days: values.days, reason };
  // Fin de journée UTC : « jusqu'au 15 » inclut le 15.
  return { until: new Date(`${values.until}T23:59:59.000Z`).toISOString(), reason };
}

export const discountSchema = z
  .object({
    kind: z.enum(["percent", "amount"]),
    value: z.coerce.number({ message: "Indiquez une valeur." }).int("Nombre entier requis.").min(1, "Au moins 1."),
    periods: z.coerce.number().int().min(1, "Au moins 1 période.").max(36, "36 périodes au maximum."),
    reason: z.string().max(300).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "percent" && value.value > 100) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "100 % au maximum." });
    }
  });
export type DiscountValues = z.infer<typeof discountSchema>;

export interface DiscountPayload {
  percent?: number;
  amount?: number;
  periods: number;
  reason?: string;
}

export function buildDiscountPayload(values: DiscountValues): DiscountPayload {
  return {
    ...(values.kind === "percent" ? { percent: values.value } : { amount: values.value }),
    periods: values.periods,
    reason: values.reason?.trim() || undefined,
  };
}

export const offerPlanSchema = z.object({
  planPriceId: z.string().min(1, "Sélectionnez un prix de plan."),
  days: z.coerce.number().int().min(1, "Au moins 1 jour.").max(3650, "3 650 jours au maximum."),
  reason: z.string().trim().min(5, "Motif obligatoire (5 caractères minimum).").max(300),
});
export type OfferPlanValues = z.infer<typeof offerPlanSchema>;

/** Libellé de la remise en cours (« 20 % · 3 périodes restantes »), ou null. */
export function describeDiscount(
  row: { discountPercent: number | null; discountAmount: number | null; discountPeriodsRemaining: number | null },
  formatAmount: (amount: number) => string,
): string | null {
  const periods = row.discountPeriodsRemaining ?? 0;
  if (periods <= 0) return null;
  const value =
    row.discountPercent != null
      ? `${row.discountPercent} %`
      : row.discountAmount != null
        ? `${formatAmount(row.discountAmount)} par période`
        : null;
  if (!value) return null;
  return `${value} · ${periods} période${periods > 1 ? "s" : ""} restante${periods > 1 ? "s" : ""}`;
}
