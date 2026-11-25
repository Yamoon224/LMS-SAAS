import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { AUTO_ACCEPT_NOTE, evaluateRefundEligibility, REFUND_ELIGIBILITY_DATA } from "../domain/refund-eligibility";
import type { RefundEligibility, RefundEligibilityDataPort } from "../domain/refund-eligibility";
import {
  applyRefundDecision,
  resolveApprovedAmount,
  RefundAlreadyRequestedError,
  RefundNotEligibleError,
} from "../domain/refund-request";
import type { RefundRequest, RefundRequestStatus } from "../domain/refund-request";
import { REFUND_REQUEST_REPOSITORY } from "../domain/refund-request.repository.port";
import type { RefundRequestRepositoryPort } from "../domain/refund-request.repository.port";
import { RefundRequestDecidedEvent, RefundRequestedEvent } from "../payments.events";

import { RefundPaymentUseCase } from "./refund-payment.use-case";

/** ENT-70 / section 9.5 : l'apprenant demande le remboursement intégral d'une formation achetée en ligne. */
@Injectable()
export class RequestRefundUseCase {
  private readonly logger = new Logger(RequestRefundUseCase.name);

  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY) private readonly repository: RefundRequestRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
    @Inject(REFUND_ELIGIBILITY_DATA) private readonly eligibilityData: RefundEligibilityDataPort,
  ) {}

  async execute(input: { userId: string; enrollmentId: string; reason?: string }): Promise<RefundRequest> {
    const payment = await this.repository.findRefundablePayment(input.userId, input.enrollmentId);
    if (!payment) {
      throw new RefundNotEligibleError("Aucun paiement en ligne remboursable pour cette inscription.");
    }
    if (await this.repository.hasActiveRequest(payment.paymentId)) {
      throw new RefundAlreadyRequestedError("Une demande de remboursement existe déjà pour ce paiement.");
    }
    const created = await this.repository.create({ payment, reason: input.reason?.trim() || null });
    const request = await this.applyEligibility(created);
    this.eventEmitter.emit(
      "refund-request.requested",
      new RefundRequestedEvent(request.id, request.tenantId, request.courseTitle, request.amount, request.currency),
    );
    return request;
  }

  /**
   * Section 9.5 : les critères sont évalués à la demande et figés avec elle. Une demande ÉLIGIBLE est acceptée
   * automatiquement (l'Admin n'a plus qu'à exécuter, l'entreprise ne peut plus la refuser) ; sinon elle suit le circuit
   * normal (l'entreprise décide). Fail-closed : si les données de la politique sont indisponibles, la demande n'est
   * jamais acceptée automatiquement.
   */
  private async applyEligibility(request: RefundRequest): Promise<RefundRequest> {
    const eligibility = await this.evaluate(request);
    if (!eligibility) return request;

    const accept = eligibility.eligible;
    await this.repository.save({
      id: request.id,
      status: accept ? "ACCEPTED" : request.status,
      decisionNote: accept ? AUTO_ACCEPT_NOTE : request.decisionNote,
      resolvedAt: null,
      eligibility,
      autoAccepted: accept,
    });
    if (!accept) return { ...request, eligibility, autoAccepted: false };

    this.eventEmitter.emit(
      "refund-request.decided",
      new RefundRequestDecidedEvent(
        request.id,
        request.learnerUserId,
        request.courseTitle,
        "ACCEPTED",
        AUTO_ACCEPT_NOTE,
        request.amount,
        request.currency,
      ),
    );
    return { ...request, status: "ACCEPTED", decisionNote: AUTO_ACCEPT_NOTE, eligibility, autoAccepted: true };
  }

  private async evaluate(request: RefundRequest): Promise<RefundEligibility | null> {
    if (!request.enrollmentId) return null;
    try {
      const data = await this.eligibilityData.load(request.enrollmentId);
      return evaluateRefundEligibility({ paidAt: request.paidAt, requestedAt: request.requestedAt, ...data });
    } catch (error) {
      this.logger.warn(`Éligibilité du remboursement ${request.id} non évaluée (circuit manuel) : ${String(error)}`);
      return null;
    }
  }
}

/** ENT-70 : l'entreprise accepte ou refuse (motif obligatoire) une demande de son périmètre. */
@Injectable()
export class DecideRefundRequestUseCase {
  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY) private readonly repository: RefundRequestRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: {
    tenantId: string;
    refundId: string;
    decision: "ACCEPT" | "REJECT";
    note?: string;
    /** Remboursement partiel : montant accordé (ACCEPT uniquement). Omis = remboursement intégral. */
    amount?: number;
  }): Promise<RefundRequestStatus> {
    const request = await this.repository.findById(input.refundId);
    // Même réponse pour « inexistante » et « autre entreprise » : on ne révèle pas l'existence.
    if (!request || request.tenantId !== input.tenantId) {
      throw new NotFoundDomainError(`Demande de remboursement introuvable: ${input.refundId}`);
    }
    const status = applyRefundDecision(request.status, input.decision, input.note);
    // Un montant n'a de sens que pour une acceptation ; il est validé APRÈS la transition (état invalide = 409).
    const amount = input.decision === "ACCEPT" ? resolveApprovedAmount(request.amount, input.amount) : request.amount;
    await this.repository.save({
      id: request.id,
      status,
      decisionNote: input.note?.trim() || null,
      resolvedAt: status === "REJECTED" ? new Date() : null,
      ...(input.decision === "ACCEPT" && { amount }),
    });
    this.eventEmitter.emit(
      "refund-request.decided",
      new RefundRequestDecidedEvent(
        request.id,
        request.learnerUserId,
        request.courseTitle,
        status === "REJECTED" ? "REJECTED" : "ACCEPTED",
        input.note?.trim() || null,
        amount,
        request.currency,
      ),
    );
    return status;
  }
}

/** Lecture : demandes d'une entreprise (ENT-70) ou file Admin par statut (suivi). */
@Injectable()
export class ListRefundRequestsUseCase {
  constructor(@Inject(REFUND_REQUEST_REPOSITORY) private readonly repository: RefundRequestRepositoryPort) {}

  forTenant(tenantId: string): Promise<RefundRequest[]> {
    return this.repository.listForTenant(tenantId);
  }

  byStatus(status: RefundRequestStatus): Promise<RefundRequest[]> {
    return this.repository.listByStatus(status);
  }

  forLearner(userId: string): Promise<RefundRequest[]> {
    return this.repository.listForLearner(userId);
  }
}

/** Admin : exécute le remboursement d'une demande acceptée par l'entreprise (ADM-26). */
@Injectable()
export class ExecuteRefundRequestUseCase {
  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY) private readonly repository: RefundRequestRepositoryPort,
    private readonly refundPaymentUseCase: RefundPaymentUseCase,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(refundId: string): Promise<void> {
    const request = await this.repository.findById(refundId);
    if (!request) throw new NotFoundDomainError(`Demande de remboursement introuvable: ${refundId}`);

    // Valide la transition avant tout appel au fournisseur : une demande non acceptée n'est jamais remboursée.
    const status = applyRefundDecision(request.status, "EXECUTE");
    await this.refundPaymentUseCase.execute(request.paymentId, request.amount, request.reason ?? undefined);
    await this.repository.save({ id: request.id, status, decisionNote: request.decisionNote, resolvedAt: new Date() });
    this.eventEmitter.emit(
      "refund-request.decided",
      new RefundRequestDecidedEvent(
        request.id,
        request.learnerUserId,
        request.courseTitle,
        "REFUNDED",
        null,
        request.amount,
        request.currency,
      ),
    );
  }
}
