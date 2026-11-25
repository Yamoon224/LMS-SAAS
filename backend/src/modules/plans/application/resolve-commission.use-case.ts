import { Inject, Injectable } from "@nestjs/common";

import { COMMISSION_RULE_REPOSITORY } from "../domain/commission-rule.repository.port";
import type {
  CommissionRuleRepositoryPort,
  CommissionType,
} from "../domain/commission-rule.repository.port";

export interface ResolvedCommission {
  percentRate: number | null;
  fixedAmount: number | null;
}

/**
 * BE-06/RG-27: résout la commission applicable à une vente au moment où
 * elle a lieu. Le résultat est figé sur la vente (consommé par le module
 * payments lors de l'écriture au grand livre) — une modification ultérieure
 * de la règle n'a aucun effet rétroactif.
 */
@Injectable()
export class ResolveCommissionUseCase {
  constructor(
    @Inject(COMMISSION_RULE_REPOSITORY)
    private readonly commissionRuleRepository: CommissionRuleRepositoryPort,
  ) {}

  async execute(type: CommissionType, tenantId: string, courseId?: string): Promise<ResolvedCommission> {
    const rule = await this.commissionRuleRepository.resolveApplicableRule(type, tenantId, { courseId });

    if (!rule) {
      return { percentRate: null, fixedAmount: null };
    }

    return { percentRate: rule.percentRate, fixedAmount: rule.fixedAmount };
  }
}
