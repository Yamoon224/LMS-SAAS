import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { PAYMENT_GATEWAY_REGISTRY } from "../domain/payment-gateway-registry.port";
import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import {
  classifyPendingPayment,
  findSuspectedDuplicates,
  isPendingExpired,
  PAYMENT_EXPIRED_REASON,
  PENDING_POLL_MIN_AGE_MS,
} from "../domain/payment-reconciliation";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import { RECONCILIATION_REPOSITORY } from "../domain/reconciliation.repository.port";
import type { PendingPaymentRow, ReconciliationRepositoryPort } from "../domain/reconciliation.repository.port";
import { WEBHOOK_EVENT_LOG } from "../domain/webhook-event-log.port";
import type { WebhookEventLogPort, WebhookEventRecord, WebhookOutcome } from "../domain/webhook-event-log.port";
import { WebhookReplayedEvent } from "../payments.events";

import { ProcessWebhookUseCase } from "./process-webhook.use-case";
import { RefundPaymentUseCase } from "./refund-payment.use-case";

/** Un paiement en attente est signalé à l'Admin au-delà de cet âge. */
export const STALE_PENDING_AGE_MS = 10 * 60 * 1000;
/** Historique examiné pour les doublons suspects. */
export const DUPLICATE_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const POLL_BATCH_SIZE = 200;
const LIST_LIMIT = 100;

export class WebhookNotReplayableError extends DomainError {
  readonly code = "WEBHOOK_NON_REJOUABLE";
}

export class NotADuplicatePaymentError extends DomainError {
  readonly code = "PAIEMENT_NON_DOUBLON";
}

export interface PendingPollReport {
  checked: number;
  succeeded: number;
  failed: number;
  expired: number;
  stillPending: number;
  /** Paiements dont la vérification fournisseur a échoué : laissés en attente, repris au prochain passage. */
  errors: number;
}

/**
 * ADM-27/section 9.6 : sondage des paiements PENDING (mobile money asynchrone). Re-vérifie auprès du fournisseur
 * (RG-06) ceux de plus de 2 minutes, via la même transition que le webhook (idempotente), puis expire en échec (motif
 * « expiré ») ceux que le fournisseur donne encore en attente après 30 minutes. Un paiement dont la vérification
 * échoue (fournisseur injoignable) n'est JAMAIS expiré : l'état réel est inconnu.
 */
@Injectable()
export class PollPendingPaymentsUseCase {
  private readonly logger = new Logger(PollPendingPaymentsUseCase.name);

  constructor(
    @Inject(RECONCILIATION_REPOSITORY) private readonly reconciliation: ReconciliationRepositoryPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY_REGISTRY) private readonly gatewayRegistry: PaymentGatewayRegistryPort,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<PendingPollReport> {
    const report: PendingPollReport = { checked: 0, succeeded: 0, failed: 0, expired: 0, stillPending: 0, errors: 0 };
    const rows = await this.reconciliation.listPendingCreatedBefore(
      new Date(now.getTime() - PENDING_POLL_MIN_AGE_MS),
      POLL_BATCH_SIZE,
    );

    for (const row of rows) {
      if (classifyPendingPayment(row.createdAt, now) !== "POLL") continue;
      try {
        await this.pollOne(row, now, report);
      } catch (error) {
        report.errors += 1;
        this.logger.warn(`Sondage du paiement ${row.id} impossible : ${String(error)}`);
      }
    }
    return report;
  }

  private async pollOne(row: PendingPaymentRow, now: Date, report: PendingPollReport): Promise<void> {
    // Relecture : un webhook a pu traiter le paiement depuis la liste — dans ce cas rien à faire (idempotence).
    const payment = await this.paymentRepository.findById(row.id);
    if (!payment?.isPending()) return;
    report.checked += 1;

    const gateway = await this.gatewayRegistry.findByCode(row.providerCode);
    if (gateway) {
      const status = await this.processWebhookUseCase.settlePending(gateway, payment);
      if (status === "SUCCEEDED") {
        report.succeeded += 1;
        return;
      }
      if (status === "FAILED") {
        report.failed += 1;
        return;
      }
    }

    // Le fournisseur confirme « en attente » (ou n'est plus configuré) : expiration passé le délai.
    if (isPendingExpired(row.createdAt, now)) {
      await this.processWebhookUseCase.expirePending(payment, PAYMENT_EXPIRED_REASON);
      report.expired += 1;
    } else {
      report.stillPending += 1;
    }
  }
}

export interface ReplayResult {
  outcome: WebhookOutcome;
}

/**
 * ADM-27 : rejeu, par un administrateur authentifié, du traitement d'un webhook en échec ou resté sans paiement.
 * Seule la référence du paiement est conservée au journal (jamais le corps) : le serveur re-vérifie auprès du
 * fournisseur, ce qui est de toute façon la source de vérité (RG-06). Idempotent : un paiement déjà traité donne
 * DUPLICATE sans aucun effet. Un webhook à signature invalide n'est jamais rejouable.
 */
@Injectable()
export class ReplayWebhookUseCase {
  constructor(
    @Inject(WEBHOOK_EVENT_LOG) private readonly eventLog: WebhookEventLogPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    @Inject(PAYMENT_GATEWAY_REGISTRY) private readonly gatewayRegistry: PaymentGatewayRegistryPort,
    private readonly processWebhookUseCase: ProcessWebhookUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(webhookEventId: string, actorUserId: string | null): Promise<ReplayResult> {
    const event = await this.eventLog.findById(webhookEventId);
    if (!event) throw new NotFoundDomainError(`Webhook introuvable: ${webhookEventId}`);
    if (event.outcome !== "ERROR" && event.outcome !== "UNKNOWN_REFERENCE") {
      throw new WebhookNotReplayableError("Seul un webhook en échec ou sans paiement connu peut être rejoué.");
    }
    if (!event.providerReference) {
      throw new WebhookNotReplayableError("La référence du paiement n'a pas été conservée : ce webhook ne peut pas être rejoué.");
    }
    const gateway = await this.gatewayRegistry.findByCode(event.providerCode);
    if (!gateway) throw new NotFoundDomainError(`Fournisseur de paiement inconnu: ${event.providerCode}`);

    const outcome = await this.replay(event, gateway);
    if (outcome !== "UNKNOWN_REFERENCE") await this.eventLog.markResolved(event.id);
    this.eventEmitter.emit("payment.webhook-replayed", new WebhookReplayedEvent(event.id, event.providerCode, outcome, actorUserId));
    return { outcome };
  }

  private async replay(event: WebhookEventRecord, gateway: PaymentGateway): Promise<WebhookOutcome> {
    const payment = await this.paymentRepository.findByProviderReference(event.providerCode, event.providerReference as string);
    if (!payment) return "UNKNOWN_REFERENCE";
    if (!payment.isPending()) return "DUPLICATE";
    await this.processWebhookUseCase.settlePending(gateway, payment);
    return "PROCESSED";
  }
}

export interface ReconciliationOverview {
  stalePendingPayments: PendingPaymentRow[];
  webhookFailures: (WebhookEventRecord & { replayable: boolean })[];
  suspectedDuplicates: {
    paymentId: string;
    originalPaymentId: string;
    tenantId: string;
    amount: number;
    currency: string;
    createdAt: Date;
    originalCreatedAt: Date;
  }[];
}

/** ADM-27 : vue unique du rapprochement — paiements en attente anciens, webhooks en échec, doublons suspects. */
@Injectable()
export class GetReconciliationOverviewUseCase {
  constructor(
    @Inject(RECONCILIATION_REPOSITORY) private readonly reconciliation: ReconciliationRepositoryPort,
    @Inject(WEBHOOK_EVENT_LOG) private readonly eventLog: WebhookEventLogPort,
  ) {}

  async execute(now: Date = new Date()): Promise<ReconciliationOverview> {
    const [stalePendingPayments, failures, candidates] = await Promise.all([
      this.reconciliation.listPendingCreatedBefore(new Date(now.getTime() - STALE_PENDING_AGE_MS), LIST_LIMIT),
      this.eventLog.listUnresolvedFailures(LIST_LIMIT),
      this.reconciliation.listCollectedEnrollmentPaymentsSince(new Date(now.getTime() - DUPLICATE_LOOKBACK_MS)),
    ]);

    return {
      stalePendingPayments,
      webhookFailures: failures.map((failure) => ({ ...failure, replayable: failure.providerReference !== null })),
      suspectedDuplicates: findSuspectedDuplicates(candidates).flatMap((group) =>
        group.duplicates.map((duplicate) => ({
          paymentId: duplicate.paymentId,
          originalPaymentId: group.original.paymentId,
          tenantId: duplicate.tenantId,
          amount: duplicate.amount,
          currency: duplicate.currency,
          createdAt: duplicate.createdAt,
          originalCreatedAt: group.original.createdAt,
        })),
      ),
    };
  }
}

/**
 * ADM-27 : rembourse intégralement un paiement en double. Le serveur RECALCULE les doublons : on ne peut rembourser
 * que le paiement signalé comme doublon (jamais l'original, jamais un paiement quelconque) ; une fois remboursé, le
 * paiement sort des candidats, un second appel échoue donc sans second remboursement.
 */
@Injectable()
export class RefundDuplicatePaymentUseCase {
  constructor(
    @Inject(RECONCILIATION_REPOSITORY) private readonly reconciliation: ReconciliationRepositoryPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
  ) {}

  async execute(paymentId: string, now: Date = new Date()): Promise<void> {
    const candidates = await this.reconciliation.listCollectedEnrollmentPaymentsSince(
      new Date(now.getTime() - DUPLICATE_LOOKBACK_MS),
    );
    const isDuplicate = findSuspectedDuplicates(candidates).some((group) =>
      group.duplicates.some((duplicate) => duplicate.paymentId === paymentId),
    );
    if (!isDuplicate) {
      throw new NotADuplicatePaymentError("Ce paiement n'est pas signalé comme un doublon : remboursement refusé.");
    }
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) throw new NotFoundDomainError(`Paiement introuvable: ${paymentId}`);
    await this.refundPaymentUseCase.execute(paymentId, payment.amount, "Paiement en double");
  }
}
