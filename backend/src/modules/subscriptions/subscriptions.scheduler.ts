import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";

import { ListRenewalsDueUseCase } from "./application/list-renewals-due.use-case";
import { ProcessGracePeriodExpiryUseCase } from "./application/process-grace-period-expiry.use-case";
import { EndNonRenewingSubscriptionsUseCase } from "./application/renewal.use-cases";
import { RenewalReminderDueEvent } from "./subscriptions.events";

/**
 * BE-12: tâches planifiées pour le cycle de vie des abonnements.
 * - Expiration des périodes de grâce dépassées (RG-02).
 * - Rappels de renouvellement J-7/J-3/J-1 (ENT-03) : émet un événement par
 *   abonnement dû, consommé par le module notifications.
 */
@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private readonly processGracePeriodExpiryUseCase: ProcessGracePeriodExpiryUseCase,
    private readonly listRenewalsDueUseCase: ListRenewalsDueUseCase,
    private readonly endNonRenewingSubscriptionsUseCase: EndNonRenewingSubscriptionsUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireElapsedGracePeriods(): Promise<void> {
    await this.processGracePeriodExpiryUseCase.execute();
  }

  /** Étape 31 : fin à l'échéance des abonnements dont le renouvellement automatique est désactivé. */
  @Cron(CronExpression.EVERY_HOUR)
  async endNonRenewingSubscriptions(): Promise<void> {
    const count = await this.endNonRenewingSubscriptionsUseCase.execute();
    if (count > 0) this.logger.log(`${count} abonnement(s) sans renouvellement automatique arrivé(s) à échéance.`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async emitUpcomingRenewalReminders(): Promise<void> {
    for (const daysUntilRenewal of [7, 3, 1]) {
      const dueSubscriptions = await this.listRenewalsDueUseCase.execute(daysUntilRenewal);
      for (const subscription of dueSubscriptions) {
        if (!subscription.currentPeriodEnd) continue;
        this.eventEmitter.emit(
          "subscription.renewal-reminder-due",
          new RenewalReminderDueEvent(
            subscription.id,
            subscription.tenantId,
            daysUntilRenewal,
            subscription.currentPeriodEnd,
          ),
        );
      }
      this.logger.log(`Rappels de renouvellement émis à J-${daysUntilRenewal}: ${dueSubscriptions.length}`);
    }
  }
}
