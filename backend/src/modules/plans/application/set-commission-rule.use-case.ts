import { Inject, Injectable } from "@nestjs/common";
import { NotFoundDomainError } from "@shared/errors";
import { DomainError } from "@shared/errors/domain-error";

import { COMMISSION_RULE_REPOSITORY } from "../domain/commission-rule.repository.port";
import type {
  CommissionRuleRecord,
  CommissionRuleRepositoryPort,
  SetCommissionRuleData,
} from "../domain/commission-rule.repository.port";

export class InvalidCommissionRuleError extends DomainError {
  readonly code = "REGLE_COMMISSION_INVALIDE";
}

/**
 * ADM-15 (ventes en ligne) / ADM-16 (ventes hors plateforme) : définit une
 * règle de commission à une portée donnée. Une règle existante n'est jamais
 * modifiée en place (RG-27 "les taux appliqués sont figés sur chaque
 * transaction") — on en crée toujours une nouvelle avec une date de début.
 */
@Injectable()
export class SetCommissionRuleUseCase {
  constructor(
    @Inject(COMMISSION_RULE_REPOSITORY)
    private readonly commissionRuleRepository: CommissionRuleRepositoryPort,
  ) {}

  async execute(input: SetCommissionRuleData): Promise<void> {
    if (input.percentRate === undefined && input.fixedAmount === undefined) {
      throw new InvalidCommissionRuleError(
        "Une règle de commission doit définir un pourcentage et/ou un montant fixe.",
      );
    }

    if ((input.scope === "TENANT" || input.scope === "COURSE") && !input.tenantId) {
      throw new InvalidCommissionRuleError(
        `Une règle à la portée ${input.scope} doit préciser l'entreprise concernée.`,
      );
    }

    if (input.scope === "COURSE" && !input.courseId) {
      throw new InvalidCommissionRuleError("Une règle à la portée COURSE doit préciser la formation.");
    }

    if (input.scope === "PLAN" && !input.planId) {
      throw new InvalidCommissionRuleError("Une règle à la portée PLAN doit préciser le plan concerné.");
    }

    await this.commissionRuleRepository.create(input);
  }

  /**
   * ADM-15/ADM-16 : modification d'une règle = nouvelle version. L'ancienne est close, la nouvelle (mêmes portée, type et cible)
   * prend le relais maintenant ; les ventes déjà conclues gardent le taux appliqué à l'époque (RG-27).
   */
  async revise(id: string, rates: { percentRate?: number | null; fixedAmount?: number | null }): Promise<CommissionRuleRecord> {
    const percentRate = rates.percentRate ?? null;
    const fixedAmount = rates.fixedAmount ?? null;
    if (percentRate === null && fixedAmount === null) {
      throw new InvalidCommissionRuleError("Une règle de commission doit définir un pourcentage et/ou un montant fixe.");
    }
    const revised = await this.commissionRuleRepository.supersede(id, { percentRate, fixedAmount });
    if (!revised) {
      throw new NotFoundDomainError("Règle de commission introuvable ou déjà remplacée.");
    }
    return revised;
  }

  /** ADM-15/ADM-16: vue Admin de toutes les règles définies. */
  async listAll(): Promise<CommissionRuleRecord[]> {
    return this.commissionRuleRepository.listAll();
  }
}
