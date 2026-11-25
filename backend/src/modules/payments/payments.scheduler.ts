import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";

import { RenewDueSubscriptionsUseCase } from "./application/renew-subscriptions.use-case";
import { PollPendingPaymentsUseCase } from "./application/reconciliation.use-cases";

/** ADM-27/section 9.6 : sondage des paiements en attente toutes les 5 minutes (mobile money asynchrone). */
@Injectable()
export class PaymentsScheduler {
  private readonly logger = new Logger(PaymentsScheduler.name);
  /** Évite le chevauchement de deux passages si le fournisseur répond lentement. */
  private running = false;

  private renewing = false;

  constructor(
    private readonly pollPendingPaymentsUseCase: PollPendingPaymentsUseCase,
    private readonly renewDueSubscriptionsUseCase: RenewDueSubscriptionsUseCase,
  ) {}

  /**
   * ENT-03 : renouvellement automatique des abonnements échus (toutes les heures). L'idempotence est garantie par
   * la réservation atomique de l'échéance côté subscriptions ; `renewing` évite seulement le chevauchement local.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async renewDueSubscriptions(): Promise<void> {
    if (this.renewing) return;
    this.renewing = true;
    try {
      const report = await this.renewDueSubscriptionsUseCase.execute();
      if (report.candidates > 0) {
        this.logger.log(
          `Renouvellements : ${report.requested} demande(s) de paiement, ${report.skipped} ignoré(s), ${report.failed} en échec.`,
        );
      }
    } catch (error) {
      this.logger.error(`Échec du job de renouvellement : ${String(error)}`);
    } finally {
      this.renewing = false;
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollPendingPayments(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const report = await this.pollPendingPaymentsUseCase.execute();
      if (report.checked > 0) {
        this.logger.log(
          `Sondage des paiements en attente : ${report.succeeded} confirmé(s), ${report.failed} échoué(s), ${report.expired} expiré(s), ${report.stillPending} en attente, ${report.errors} erreur(s).`,
        );
      }
    } catch (error) {
      this.logger.error(`Échec du sondage des paiements en attente : ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}
