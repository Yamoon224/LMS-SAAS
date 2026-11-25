import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  INACTIVE_ACCOUNTS_BATCH_SIZE,
  INACTIVE_LEARNER_RETENTION_MONTHS,
  isRetentionPurgeEnabled,
  monthsBefore,
  READ_NOTIFICATION_RETENTION_MONTHS,
} from "../domain/privacy-policy";
import { PRIVACY_REPOSITORY } from "../domain/privacy.repository.port";
import type { PrivacyRepositoryPort } from "../domain/privacy.repository.port";
import { ExpiredPersonalDataPurgedEvent, LearnerAccountDeletedEvent } from "../privacy.events";

export interface PurgeResult {
  enabled: boolean;
  notificationsDeleted: number;
  accountsAnonymized: number;
}

/**
 * Durées de conservation (section 11) : notifications lues de plus de 12 mois supprimées, comptes apprenants
 * inactifs depuis 36 mois anonymisés. Un compte avec un paiement ou remboursement en cours est écarté (repris à la
 * prochaine exécution). Désactivable par `RETENTION_PURGE_ENABLED=false`.
 */
@Injectable()
export class PurgeExpiredPersonalDataUseCase {
  private readonly logger = new Logger(PurgeExpiredPersonalDataUseCase.name);

  constructor(
    @Inject(PRIVACY_REPOSITORY) private readonly repository: PrivacyRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(now: Date = new Date(), env: Record<string, string | undefined> = process.env): Promise<PurgeResult> {
    if (!isRetentionPurgeEnabled(env)) {
      return { enabled: false, notificationsDeleted: 0, accountsAnonymized: 0 };
    }

    const notificationsDeleted = await this.repository.deleteReadNotificationsBefore(
      monthsBefore(now, READ_NOTIFICATION_RETENTION_MONTHS),
    );

    const inactiveIds = await this.repository.listInactiveLearnerIds(
      monthsBefore(now, INACTIVE_LEARNER_RETENTION_MONTHS),
      INACTIVE_ACCOUNTS_BATCH_SIZE,
    );
    let accountsAnonymized = 0;
    for (const userId of inactiveIds) {
      const blockers = await this.repository.findDeletionBlockers(userId);
      if (blockers.pendingPayments > 0 || blockers.openRefunds > 0) continue;
      const account = await this.repository.findAccount(userId);
      if (!account || !(await this.repository.anonymizeLearner(userId, now))) continue;
      accountsAnonymized += 1;
      this.eventEmitter.emit(
        "privacy.account-deleted",
        new LearnerAccountDeletedEvent(userId, account.tenantId, "RETENTION"),
      );
    }

    if (notificationsDeleted > 0 || accountsAnonymized > 0) {
      this.logger.log(
        `Purge de conservation : ${notificationsDeleted} notification(s) supprimée(s), ${accountsAnonymized} compte(s) inactif(s) anonymisé(s).`,
      );
      this.eventEmitter.emit(
        "privacy.expired-data-purged",
        new ExpiredPersonalDataPurgedEvent(notificationsDeleted, accountsAnonymized),
      );
    }
    return { enabled: true, notificationsDeleted, accountsAnonymized };
  }
}
