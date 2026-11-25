import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import type { RefundEligibilityDataPort } from "../domain/refund-eligibility";
import type { RefundRequest } from "../domain/refund-request";
import { RefundAlreadyRequestedError, RefundAmountInvalidError, RefundNotEligibleError } from "../domain/refund-request";
import type { RefundRequestRepositoryPort } from "../domain/refund-request.repository.port";
import type { RefundRequestDecidedEvent } from "../payments.events";

import type { RefundPaymentUseCase } from "./refund-payment.use-case";
import { DecideRefundRequestUseCase, ExecuteRefundRequestUseCase, RequestRefundUseCase } from "./refund-requests.use-cases";

function buildRequest(overrides: Partial<RefundRequest> = {}): RefundRequest {
  return {
    id: "refund-1",
    paymentId: "payment-1",
    tenantId: "tenant-1",
    amount: 25000,
    currency: "XOF",
    reason: "Achat par erreur",
    decisionNote: null,
    status: "REQUESTED",
    requestedAt: new Date("2026-11-10T00:00:00Z"),
    resolvedAt: null,
    enrollmentId: "enrollment-1",
    learnerUserId: "user-1",
    courseTitle: "Excel avancé",
    learnerName: "Awa Kone",
    learnerEmail: "awa@example.com",
    paidAt: new Date("2026-11-09T00:00:00Z"),
    ...overrides,
  };
}

function buildRepository(request: RefundRequest | null): jest.Mocked<RefundRequestRepositoryPort> {
  return {
    findRefundablePayment: jest.fn(),
    hasActiveRequest: jest.fn(),
    create: jest.fn(),
    findById: jest.fn().mockResolvedValue(request),
    save: jest.fn().mockResolvedValue(undefined),
    listForTenant: jest.fn(),
    listForLearner: jest.fn(),
    listByStatus: jest.fn(),
  };
}

/** Données de politique d'un achat ancien et avancé : jamais éligible, la demande suit le circuit manuel. */
const ineligibleData = (): RefundEligibilityDataPort => ({
  load: jest.fn().mockResolvedValue({
    completedLessons: 8,
    totalLessons: 10,
    submittedAssessmentAttempts: 1,
    certificateIssued: false,
  }),
});

const emitter = () => ({ emit: jest.fn() }) as unknown as jest.Mocked<EventEmitter2>;

describe("RequestRefundUseCase", () => {
  const payment = { paymentId: "payment-1", tenantId: "tenant-1", amount: 25000, currency: "XOF" };

  it("refuse si l'inscription n'a pas de paiement en ligne remboursable", async () => {
    const repository = buildRepository(null);
    repository.findRefundablePayment.mockResolvedValue(null);
    await expect(new RequestRefundUseCase(repository, emitter(), ineligibleData()).execute({ userId: "u", enrollmentId: "e" })).rejects.toThrow(
      RefundNotEligibleError,
    );
  });

  it("refuse une seconde demande active sur le même paiement", async () => {
    const repository = buildRepository(null);
    repository.findRefundablePayment.mockResolvedValue(payment);
    repository.hasActiveRequest.mockResolvedValue(true);
    await expect(new RequestRefundUseCase(repository, emitter(), ineligibleData()).execute({ userId: "u", enrollmentId: "e" })).rejects.toThrow(
      RefundAlreadyRequestedError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("crée la demande avec un motif nettoyé et prévient l'entreprise", async () => {
    const repository = buildRepository(null);
    const events = emitter();
    repository.findRefundablePayment.mockResolvedValue(payment);
    repository.hasActiveRequest.mockResolvedValue(false);
    repository.create.mockResolvedValue(buildRequest());
    await new RequestRefundUseCase(repository, events, ineligibleData()).execute({ userId: "u", enrollmentId: "e", reason: "  erreur  " });
    expect(repository.create).toHaveBeenCalledWith({ payment, reason: "erreur" });
    expect(events.emit).toHaveBeenCalledWith(
      "refund-request.requested",
      expect.objectContaining({ tenantId: "tenant-1", courseTitle: "Excel avancé", amount: 25000, currency: "XOF" }),
    );
  });

  it("n'émet rien quand la demande est refusée", async () => {
    const repository = buildRepository(null);
    const events = emitter();
    repository.findRefundablePayment.mockResolvedValue(null);
    await expect(new RequestRefundUseCase(repository, events, ineligibleData()).execute({ userId: "u", enrollmentId: "e" })).rejects.toThrow();
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("DecideRefundRequestUseCase", () => {
  it("traite une demande d'une autre entreprise comme introuvable", async () => {
    const repository = buildRepository(buildRequest({ tenantId: "autre-tenant" }));
    const useCase = new DecideRefundRequestUseCase(repository, emitter());
    await expect(
      useCase.execute({ tenantId: "tenant-1", refundId: "refund-1", decision: "ACCEPT" }),
    ).rejects.toThrow(NotFoundDomainError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("notifie l'apprenant du refus avec le motif", async () => {
    const repository = buildRepository(buildRequest());
    const events = emitter();
    await new DecideRefundRequestUseCase(repository, events).execute({
      tenantId: "tenant-1",
      refundId: "refund-1",
      decision: "REJECT",
      note: "  Progression trop avancée ",
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "REJECTED", decisionNote: "Progression trop avancée" }),
    );
    const [name, event] = events.emit.mock.calls[0] as [string, RefundRequestDecidedEvent];
    expect(name).toBe("refund-request.decided");
    expect(event).toMatchObject({ learnerUserId: "user-1", outcome: "REJECTED", note: "Progression trop avancée" });
  });

});

describe("DecideRefundRequestUseCase : montant accordé", () => {
  it("accepte sans montant : remboursement intégral, montant inchangé", async () => {
    const repository = buildRepository(buildRequest());
    const events = emitter();
    await new DecideRefundRequestUseCase(repository, events).execute({ tenantId: "tenant-1", refundId: "refund-1", decision: "ACCEPT" });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: "ACCEPTED", amount: 25000 }));
    expect(events.emit.mock.calls[0]?.[1]).toMatchObject({ outcome: "ACCEPTED", amount: 25000 });
  });

  it("accepte un remboursement partiel : le montant accordé est enregistré et annoncé à l'apprenant", async () => {
    const repository = buildRepository(buildRequest());
    const events = emitter();
    await new DecideRefundRequestUseCase(repository, events).execute({
      tenantId: "tenant-1",
      refundId: "refund-1",
      decision: "ACCEPT",
      amount: 10000,
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: "ACCEPTED", amount: 10000 }));
    expect(events.emit.mock.calls[0]?.[1]).toMatchObject({ amount: 10000 });
  });

  it.each([0, -5, 25001, 100.5])("refuse un montant accordé invalide (%s) sans rien écrire", async (amount) => {
    const repository = buildRepository(buildRequest());
    const events = emitter();
    await expect(
      new DecideRefundRequestUseCase(repository, events).execute({ tenantId: "tenant-1", refundId: "refund-1", decision: "ACCEPT", amount }),
    ).rejects.toThrow(RefundAmountInvalidError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("un refus n'écrase jamais le montant, même si un montant est fourni", async () => {
    const repository = buildRepository(buildRequest());
    await new DecideRefundRequestUseCase(repository, emitter()).execute({
      tenantId: "tenant-1",
      refundId: "refund-1",
      decision: "REJECT",
      note: "non",
      amount: 5,
    });
    expect(repository.save.mock.calls[0]?.[0]).not.toHaveProperty("amount");
  });

  it("n'émet rien quand la décision est invalide", async () => {
    const repository = buildRepository(buildRequest({ status: "REFUNDED" }));
    const events = emitter();
    await expect(
      new DecideRefundRequestUseCase(repository, events).execute({
        tenantId: "tenant-1",
        refundId: "refund-1",
        decision: "ACCEPT",
      }),
    ).rejects.toThrow(InvalidStateTransitionError);
    expect(events.emit).not.toHaveBeenCalled();
  });
});

describe("ExecuteRefundRequestUseCase", () => {
  it("n'appelle jamais le fournisseur pour une demande non acceptée", async () => {
    const refundPayment = { execute: jest.fn() } as unknown as jest.Mocked<RefundPaymentUseCase>;
    const useCase = new ExecuteRefundRequestUseCase(buildRepository(buildRequest()), refundPayment, emitter());
    await expect(useCase.execute("refund-1")).rejects.toThrow(InvalidStateTransitionError);
    expect(refundPayment.execute).not.toHaveBeenCalled();
  });

  it("rembourse, enregistre puis notifie l'apprenant", async () => {
    const refundPayment = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RefundPaymentUseCase>;
    const repository = buildRepository(buildRequest({ status: "ACCEPTED" }));
    const events = emitter();
    await new ExecuteRefundRequestUseCase(repository, refundPayment, events).execute("refund-1");
    expect(refundPayment.execute).toHaveBeenCalledWith("payment-1", 25000, "Achat par erreur");
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: "REFUNDED" }));
    expect(events.emit.mock.calls[0]?.[1]).toMatchObject({ outcome: "REFUNDED" });
  });

  it("rembourse le montant accordé (partiel), pas le montant du paiement", async () => {
    const refundPayment = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<RefundPaymentUseCase>;
    const repository = buildRepository(buildRequest({ status: "ACCEPTED", amount: 10000 }));
    await new ExecuteRefundRequestUseCase(repository, refundPayment, emitter()).execute("refund-1");
    expect(refundPayment.execute).toHaveBeenCalledWith("payment-1", 10000, "Achat par erreur");
  });
});
