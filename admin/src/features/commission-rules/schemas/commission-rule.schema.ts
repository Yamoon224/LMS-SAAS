import { z } from "zod";

/** Doit rester cohérent avec SetCommissionRuleDto (CommissionScopeDto / CommissionTypeDto). */
export const commissionScopeSchema = z.enum(["GLOBAL", "PLAN", "TENANT", "COURSE"]);
export type CommissionScope = z.infer<typeof commissionScopeSchema>;

export const commissionTypeSchema = z.enum(["ONLINE", "OFFLINE"]);
export type CommissionType = z.infer<typeof commissionTypeSchema>;

export const COMMISSION_SCOPE_LABELS: Record<CommissionScope, string> = {
  GLOBAL: "Globale (toute la plateforme)",
  PLAN: "Par plan",
  TENANT: "Par entreprise",
  COURSE: "Par formation",
};

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  ONLINE: "Ventes en ligne",
  OFFLINE: "Ventes hors plateforme",
};

export const commissionRuleSchema = z
  .object({
    id: z.string(),
    scope: commissionScopeSchema,
    type: commissionTypeSchema,
    tenantId: z.string().nullable(),
    planId: z.string().nullable(),
    courseId: z.string().nullable(),
    percentRate: z.number().nullable(),
    fixedAmount: z.number().nullable(),
    /** Début de validité ; `validUntil` renseigné = règle remplacée par une version plus récente. */
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date().nullable(),
  })
  .passthrough();
export type CommissionRule = z.infer<typeof commissionRuleSchema>;

/** Doit rester cohérent avec SetCommissionRuleDto. */
export const setCommissionRuleSchema = z
  .object({
    scope: commissionScopeSchema,
    type: commissionTypeSchema,
    tenantId: z.string().optional().or(z.literal("")),
    planId: z.string().optional().or(z.literal("")),
    courseId: z.string().optional().or(z.literal("")),
    percentRate: z.coerce.number().min(0).max(100).optional(),
    fixedAmount: z.coerce.number().min(0).optional(),
  })
  .refine((data) => data.percentRate !== undefined || data.fixedAmount !== undefined, {
    message: "Un pourcentage et/ou un montant fixe est requis.",
    path: ["percentRate"],
  })
  .refine((data) => data.scope !== "TENANT" || !!data.tenantId, {
    message: "L'identifiant de l'entreprise est requis pour une règle à la portée Entreprise.",
    path: ["tenantId"],
  })
  .refine((data) => data.scope !== "COURSE" || (!!data.tenantId && !!data.courseId), {
    message: "L'entreprise et la formation sont requises pour une règle à la portée Formation.",
    path: ["courseId"],
  })
  .refine((data) => data.scope !== "PLAN" || !!data.planId, {
    message: "L'identifiant du plan est requis pour une règle à la portée Plan.",
    path: ["planId"],
  });
export type SetCommissionRuleValues = z.infer<typeof setCommissionRuleSchema>;

/** Une règle est « en vigueur » tant qu'aucune version plus récente ne l'a remplacée. */
export function isRuleCurrent(rule: CommissionRule, now = new Date()): boolean {
  return rule.validUntil === null || rule.validUntil > now;
}

/** Doit rester cohérent avec ReviseCommissionRuleDto : seuls les taux changent (portée, type et cible sont figés). */
export const reviseCommissionRuleSchema = z
  .object({
    percentRate: z.coerce.number().min(0, "0 % minimum.").max(100, "100 % maximum.").optional(),
    fixedAmount: z.coerce.number().min(0, "Montant positif ou nul.").optional(),
  })
  .refine((data) => data.percentRate !== undefined || data.fixedAmount !== undefined, {
    message: "Un pourcentage et/ou un montant fixe est requis.",
    path: ["percentRate"],
  });
export type ReviseCommissionRuleValues = z.infer<typeof reviseCommissionRuleSchema>;
