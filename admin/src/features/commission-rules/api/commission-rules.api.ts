import type { CommissionRule, ReviseCommissionRuleValues, SetCommissionRuleValues } from "../schemas/commission-rule.schema";
import { commissionRuleSchema } from "../schemas/commission-rule.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchCommissionRules(): Promise<CommissionRule[]> {
  const data = await apiClient.get<unknown[]>("/admin/plans/commission-rules");
  return commissionRuleSchema.array().parse(data);
}

export interface SetCommissionRuleResponse {
  scope: string;
  type: string;
}

/** PUT /admin/plans/commission-rules/:id : nouvelle version de la règle (l'ancienne est close, les ventes passées gardent leur taux). */
export async function reviseCommissionRule(id: string, values: ReviseCommissionRuleValues): Promise<CommissionRule> {
  const data = await apiClient.put<unknown, { percentRate: number | null; fixedAmount: number | null }>(`/admin/plans/commission-rules/${id}`, {
    percentRate: values.percentRate ?? null,
    fixedAmount: values.fixedAmount ?? null,
  });
  return commissionRuleSchema.parse(data);
}

export async function setCommissionRule(
  values: SetCommissionRuleValues,
): Promise<SetCommissionRuleResponse> {
  const payload = {
    ...values,
    tenantId: values.tenantId || undefined,
    planId: values.planId || undefined,
    courseId: values.courseId || undefined,
  };
  return apiClient.post<SetCommissionRuleResponse, typeof payload>(
    "/admin/plans/commission-rules",
    payload,
  );
}
