import { PlatformSettingsFacade } from "@modules/platform-settings/platform-settings.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { Injectable, Logger } from "@nestjs/common";
import { DomainError } from "@shared/errors/domain-error";

import { isAutomaticPayoutDay } from "../domain/payout-schedule";

import { RequestPayoutUseCase } from "./request-payout.use-case";

export interface AutomaticPayoutsReport {
  /** false si la fréquence est MANUAL ou si ce n'est pas un jour de vague : rien n'a été tenté. */
  ran: boolean;
  created: number;
  /** Entreprises ignorées, avec le code métier du motif (seuil, compte non vérifié, demande déjà ouverte...). */
  skipped: { tenantId: string; reason: string }[];
}

/**
 * ADM-23 : reversement automatique. Selon la fréquence des paramètres financiers, crée une demande (REQUESTED, auteur
 * « système ») pour chaque entreprise opérationnelle dont le disponible atteint le seuil ET dont le compte de
 * reversement est vérifié. Les contrôles (seuil, compte vérifié, une seule demande ouverte) sont ceux de la demande
 * manuelle : ils vivent dans RequestPayoutUseCase, jamais dupliqués ici. La double validation humaine (validation,
 * approbation, exécution) reste obligatoire : ce cas d'usage ne fait que PROPOSER.
 */
@Injectable()
export class RunAutomaticPayoutsUseCase {
  private readonly logger = new Logger(RunAutomaticPayoutsUseCase.name);

  constructor(
    private readonly settingsFacade: PlatformSettingsFacade,
    private readonly tenantsFacade: TenantsFacade,
    private readonly requestPayoutUseCase: RequestPayoutUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<AutomaticPayoutsReport> {
    const settings = await this.settingsFacade.getFinanceSettings();
    if (!isAutomaticPayoutDay(settings.payoutFrequency, now)) {
      return { ran: false, created: 0, skipped: [] };
    }

    const report: AutomaticPayoutsReport = { ran: true, created: 0, skipped: [] };
    for (const tenant of await this.tenantsFacade.listAll()) {
      if (!tenant.isOperational()) continue;
      try {
        await this.requestPayoutUseCase.execute(tenant.id, settings.minimumPayoutThreshold, true);
        report.created += 1;
      } catch (error) {
        if (error instanceof DomainError) {
          report.skipped.push({ tenantId: tenant.id, reason: error.code });
        } else {
          // Une panne ponctuelle sur une entreprise ne doit pas empêcher les autres : journalisée, reprise au prochain tour.
          this.logger.error(`Reversement automatique impossible pour ${tenant.id}: ${String(error)}`);
          report.skipped.push({ tenantId: tenant.id, reason: "ERREUR_INATTENDUE" });
        }
      }
    }
    this.logger.log(`Reversements automatiques : ${report.created} demande(s) créée(s), ${report.skipped.length} ignorée(s).`);
    return report;
  }
}
