import {
  TwoFactorDisabledEvent,
  TwoFactorEnabledEvent,
  TwoFactorRecoveryCodeUsedEvent,
  TwoFactorResetEvent,
} from "@modules/auth/auth.events";
import { AttestationIssuedEvent, AttestationRevokedEvent, CertificateIssuedEvent } from "@modules/certificates/certificates.events";
import { CourseArchivedEvent, CoursePublishedEvent } from "@modules/courses/courses.events";
import { IntegrationChangedEvent } from "@modules/integrations/integrations.events";
import { LiveAttendanceMarkedEvent } from "@modules/live-sessions/live-sessions.events";
import { MediaAssetRejectedEvent } from "@modules/media/media.events";
import { PaymentFailedEvent, RefundProcessedEvent, WebhookReplayedEvent } from "@modules/payments/payments.events";
import { PlanArchivedEvent, PlanUpdatedEvent } from "@modules/plans/plans.events";
import { FinanceSettingChangedEvent } from "@modules/platform-settings/platform-settings.events";
import {
  ExpiredPersonalDataPurgedEvent,
  LearnerAccountDeletedEvent,
  LearnerDataExportedEvent,
} from "@modules/privacy/privacy.events";
import {
  PlanChangedEvent,
  SubscriptionDiscountChangedEvent,
  SubscriptionEnteredGracePeriodEvent,
  SubscriptionExpiredEvent,
  SubscriptionPeriodExtendedEvent,
  SubscriptionPlanOfferedEvent,
} from "@modules/subscriptions/subscriptions.events";
import { TenantArchivedEvent, TenantSettingsChangedEvent, TenantSuspendedEvent } from "@modules/tenants/tenants.events";
import {
  TenantOwnershipTransferredEvent,
  UserAdminActionEvent,
  UserDeactivatedEvent,
  UserReactivatedEvent,
  UserSuspendedEvent,
} from "@modules/users/users.events";
import { UsersFacade } from "@modules/users/users.facade";
import { PayoutExecutedEvent, PayoutRequestedEvent } from "@modules/wallets/wallets.events";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { RecordAuditEntryUseCase } from "./record-audit-entry.use-case";

/**
 * RG-19: "toute action sensible est inscrite au journal d'audit." Écoute les
 * événements de domaine déjà émis par les autres modules plutôt que d'être
 * appelé en ligne depuis chacun d'eux — un module métier n'a jamais à
 * connaître l'existence du journal d'audit (section 13.2, communication par
 * événements). Quand l'événement ne porte pas tenantId (ex. UserSuspended),
 * il est résolu via UsersFacade plutôt que supposé.
 */
@Injectable()
export class AuditSensitiveEventsListener {
  constructor(
    private readonly recordAuditEntryUseCase: RecordAuditEntryUseCase,
    private readonly usersFacade: UsersFacade,
  ) {}

  @OnEvent("tenant.suspended")
  async onTenantSuspended(event: TenantSuspendedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "tenant.suspended",
      objectType: "Tenant",
      objectId: event.tenantId,
    });
  }

  @OnEvent("tenant.archived")
  async onTenantArchived(event: TenantArchivedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "tenant.archived",
      objectType: "Tenant",
      objectId: event.tenantId,
    });
  }

  @OnEvent("user.suspended")
  async onUserSuspended(event: UserSuspendedEvent): Promise<void> {
    const user = await this.usersFacade.findById(event.userId);
    await this.recordAuditEntryUseCase.execute({
      tenantId: user?.tenantId ?? null,
      actorId: event.actorId,
      action: "user.suspended",
      objectType: "User",
      objectId: event.userId,
    });
  }

  /** ADM-06 : réactivation d'un compte (acteur = administrateur plateforme si l'action vient du back-office). */
  @OnEvent("user.reactivated")
  async onUserReactivated(event: UserReactivatedEvent): Promise<void> {
    const user = await this.usersFacade.findById(event.userId);
    await this.recordAuditEntryUseCase.execute({
      tenantId: user?.tenantId ?? null,
      actorId: event.actorId,
      action: "user.reactivated",
      objectType: "User",
      objectId: event.userId,
    });
  }

  /** ADM-06 : renvoi d'invitation / envoi d'un lien de réinitialisation (jamais le lien ni le jeton). */
  @OnEvent("user.admin-action")
  async onUserAdminAction(event: UserAdminActionEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: `user.${event.action}`,
      objectType: "User",
      objectId: event.userId,
    });
  }

  /** ADM-06 : transfert de propriété (identifiants des comptes concernés uniquement). */
  @OnEvent("tenant.ownership-transferred")
  async onTenantOwnershipTransferred(event: TenantOwnershipTransferredEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "tenant.ownership-transferred",
      objectType: "Tenant",
      objectId: event.tenantId,
      after: { newOwnerUserId: event.newOwnerUserId, previousOwnerUserIds: [...event.previousOwnerUserIds] },
    });
  }

  /** ADM-09 : prolongation de période par un administrateur. */
  @OnEvent("subscription.period-extended")
  async onSubscriptionPeriodExtended(event: SubscriptionPeriodExtendedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "subscription.period-extended",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      before: { currentPeriodEnd: event.previousPeriodEnd },
      after: { currentPeriodEnd: event.newPeriodEnd, reason: event.reason },
    });
  }

  /** ADM-09 : remise posée ou retirée (`periods` = 0). */
  @OnEvent("subscription.discount-changed")
  async onSubscriptionDiscountChanged(event: SubscriptionDiscountChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: event.periods > 0 ? "subscription.discount-applied" : "subscription.discount-removed",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      after: { percent: event.percent, amount: event.amount, periods: event.periods, reason: event.reason },
    });
  }

  /** ADM-09 : plan offert sans paiement, avec son motif obligatoire. */
  @OnEvent("subscription.plan-offered")
  async onSubscriptionPlanOffered(event: SubscriptionPlanOfferedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "subscription.plan-offered",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      after: { planPriceId: event.planPriceId, periodEnd: event.periodEnd, reason: event.reason },
    });
  }

  /** ADM-13 : modification d'un plan (noms des champs seulement). */
  @OnEvent("plan.updated")
  async onPlanUpdated(event: PlanUpdatedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: event.actorId,
      action: "plan.updated",
      objectType: "Plan",
      objectId: event.planId,
      after: { changedFields: [...event.changedFields] },
    });
  }

  @OnEvent("plan.archived")
  async onPlanArchived(event: PlanArchivedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: event.actorId,
      action: event.archived ? "plan.archived" : "plan.unarchived",
      objectType: "Plan",
      objectId: event.planId,
    });
  }

  @OnEvent("user.deactivated")
  async onUserDeactivated(event: UserDeactivatedEvent): Promise<void> {
    const user = await this.usersFacade.findById(event.userId);
    await this.recordAuditEntryUseCase.execute({
      tenantId: user?.tenantId ?? null,
      actorId: null,
      action: "user.deactivated",
      objectType: "User",
      objectId: event.userId,
    });
  }

  /** Étape 28 : fichier refusé par l'antivirus. Seul le code stable du motif est journalisé, jamais le nom de la menace. */
  @OnEvent("media-asset.rejected")
  async onMediaAssetRejected(event: MediaAssetRejectedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "media.rejected",
      objectType: "MediaAsset",
      objectId: event.mediaAssetId,
      after: { reason: event.reason },
    });
  }

  /** Étape 28 (RGPD) : export des données, suppression de compte et purge de conservation sont tracés (sans donnée perso). */
  @OnEvent("privacy.data-exported")
  async onLearnerDataExported(event: LearnerDataExportedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "privacy.data-exported",
      objectType: "User",
      objectId: event.userId,
      after: event.counts,
    });
  }

  @OnEvent("privacy.account-deleted")
  async onLearnerAccountDeleted(event: LearnerAccountDeletedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "privacy.account-deleted",
      objectType: "User",
      objectId: event.userId,
      after: { origin: event.origin },
    });
  }

  @OnEvent("privacy.expired-data-purged")
  async onExpiredPersonalDataPurged(event: ExpiredPersonalDataPurgedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: null,
      action: "privacy.expired-data-purged",
      objectType: "Platform",
      objectId: "retention",
      after: { notificationsDeleted: event.notificationsDeleted, accountsAnonymized: event.accountsAnonymized },
    });
  }

  @OnEvent("course.published")
  async onCoursePublished(event: CoursePublishedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "course.published",
      objectType: "Course",
      objectId: event.courseId,
    });
  }

  @OnEvent("course.archived")
  async onCourseArchived(event: CourseArchivedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "course.archived",
      objectType: "Course",
      objectId: event.courseId,
    });
  }

  @OnEvent("certificate.issued")
  async onCertificateIssued(event: CertificateIssuedEvent): Promise<void> {
    const learner = await this.usersFacade.findById(event.learnerUserId);
    await this.recordAuditEntryUseCase.execute({
      tenantId: learner?.tenantId ?? null,
      actorId: null,
      action: "certificate.issued",
      objectType: "Certificate",
      objectId: event.certificateId,
      after: { courseTitle: event.courseTitle, learnerUserId: event.learnerUserId },
    });
  }

  @OnEvent("attestation.issued")
  async onAttestationIssued(event: AttestationIssuedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "attestation.issued",
      objectType: "Attestation",
      objectId: event.attestationId,
      after: { courseTitle: event.courseTitle, learnerUserId: event.learnerUserId },
    });
  }

  @OnEvent("attestation.revoked")
  async onAttestationRevoked(event: AttestationRevokedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "attestation.revoked",
      objectType: "Attestation",
      objectId: event.attestationId,
      after: { reason: event.reason },
    });
  }

  @OnEvent("live-attendance.marked")
  async onLiveAttendanceMarked(event: LiveAttendanceMarkedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "live-attendance.marked",
      objectType: "LiveSession",
      objectId: event.liveSessionId,
      after: { learnerUserId: event.learnerUserId, present: event.present },
    });
  }

  @OnEvent("payment.failed")
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.payment.tenantId,
      actorId: null,
      action: "payment.failed",
      objectType: "Payment",
      objectId: event.payment.id,
      after: { amount: event.payment.amount, currency: event.payment.currency, type: event.payment.type },
    });
  }

  @OnEvent("payment.refund-processed")
  async onRefundProcessed(event: RefundProcessedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.payment.tenantId,
      actorId: null,
      action: "payment.refund-processed",
      objectType: "Payment",
      objectId: event.payment.id,
      after: { amount: event.payment.amount, currency: event.payment.currency },
    });
  }

  @OnEvent("subscription.plan-changed")
  async onPlanChanged(event: PlanChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "subscription.plan-changed",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      after: { newPlanPriceId: event.newPlanPriceId, immediate: event.immediate },
    });
  }

  @OnEvent("subscription.plan-change-scheduled")
  async onPlanChangeScheduled(event: PlanChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "subscription.plan-change-scheduled",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      after: { newPlanPriceId: event.newPlanPriceId, immediate: event.immediate },
    });
  }

  @OnEvent("subscription.grace-period-started")
  async onGracePeriod(event: SubscriptionEnteredGracePeriodEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "subscription.grace-period-started",
      objectType: "Subscription",
      objectId: event.subscriptionId,
      after: { graceEndsAt: event.graceEndsAt },
    });
  }

  @OnEvent("subscription.expired")
  async onSubscriptionExpired(event: SubscriptionExpiredEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "subscription.expired",
      objectType: "Subscription",
      objectId: event.subscriptionId,
    });
  }

  @OnEvent("payout.requested")
  async onPayoutRequested(event: PayoutRequestedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "payout.requested",
      objectType: "Payout",
      objectId: event.payoutId,
      // Étape 30 : une demande générée par la tâche planifiée est signalée (auteur « système »).
      ...(event.automatic && { after: { automatic: true } }),
    });
  }

  /** Étape 30 (ADM-21/23) : champ et ancienne/nouvelle valeur (nombre ou code), jamais un secret. */
  @OnEvent("finance-setting.changed")
  async onFinanceSettingChanged(event: FinanceSettingChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: event.actorUserId,
      action: "finance-setting.changed",
      objectType: "FinanceSetting",
      objectId: event.field,
      before: { value: event.previousValue },
      after: { value: event.newValue },
    });
  }

  /** Étape 30 (ADM-27) : rejeu d'un webhook par un administrateur ; ni corps ni signature, seulement l'issue. */
  @OnEvent("payment.webhook-replayed")
  async onWebhookReplayed(event: WebhookReplayedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: event.actorUserId,
      action: "payment.webhook-replayed",
      objectType: "WebhookEvent",
      objectId: event.webhookEventId,
      after: { providerCode: event.providerCode, outcome: event.outcome },
    });
  }

  @OnEvent("payout.executed")
  async onPayoutExecuted(event: PayoutExecutedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: null,
      action: "payout.executed",
      objectType: "Payout",
      objectId: event.payoutId,
    });
  }

  /** ENT-08/11/12 : seuls les NOMS des champs modifiés sont journalisés, jamais une valeur (compte, contacts...). */
  @OnEvent("tenant.settings-changed")
  async onTenantSettingsChanged(event: TenantSettingsChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "tenant.settings-changed",
      objectType: "Tenant",
      objectId: event.tenantId,
      after: { changedFields: event.changedFields },
    });
  }

  /** ADM-37 : seuls les NOMS des champs modifiés sont journalisés, jamais une valeur. */
  @OnEvent("integration.changed")
  async onIntegrationChanged(event: IntegrationChangedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: null,
      actorId: event.actorId,
      action: event.kind === "RESET" ? "integration.reset" : "integration.updated",
      objectType: "Integration",
      objectId: event.provider,
      after: { changedFields: event.changedFields },
    });
  }

  /** Section 4.1/11 : événements de sécurité de la 2FA (jamais de secret ni de code). */
  @OnEvent("auth.two-factor-enabled")
  async onTwoFactorEnabled(event: TwoFactorEnabledEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.userId,
      action: "auth.two-factor-enabled",
      objectType: "User",
      objectId: event.userId,
    });
  }

  @OnEvent("auth.two-factor-disabled")
  async onTwoFactorDisabled(event: TwoFactorDisabledEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.userId,
      action: "auth.two-factor-disabled",
      objectType: "User",
      objectId: event.userId,
    });
  }

  /** ADM-36 : un administrateur a réinitialisé la 2FA d'un autre compte. */
  @OnEvent("auth.two-factor-reset")
  async onTwoFactorReset(event: TwoFactorResetEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.actorId,
      action: "auth.two-factor-reset",
      objectType: "User",
      objectId: event.targetUserId,
    });
  }

  @OnEvent("auth.two-factor-recovery-used")
  async onTwoFactorRecoveryUsed(event: TwoFactorRecoveryCodeUsedEvent): Promise<void> {
    await this.recordAuditEntryUseCase.execute({
      tenantId: event.tenantId,
      actorId: event.userId,
      action: "auth.two-factor-recovery-used",
      objectType: "User",
      objectId: event.userId,
    });
  }
}
