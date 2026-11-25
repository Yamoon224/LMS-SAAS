import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError } from "@shared/errors";

import { AUTO_ACCEPT_NOTE } from "../domain/refund-eligibility";
import type { RefundEligibilityData, RefundEligibilityDataPort } from "../domain/refund-eligibility";
import type { RefundRequest } from "../domain/refund-request";
import type { RefundRequestRepositoryPort } from "../domain/refund-request.repository.port";
import type { RefundRequestDecidedEvent } from "../payments.events";

import { DecideRefundRequestUseCase, RequestRefundUseCase } from "./refund-requests.use-cases";

const REQUESTED_AT = new Date("2026-11-18T12:00:00Z");
const DAY = 86_400_000;

function request(overrides: Partial<RefundRequest> = {}): RefundRequest {
  return {
    id: "refund-1",
    paymentId: "payment-1",
    tenantId: "tenant-1",
    amount: 25000,
    currency: "XOF",
    reason: null,
    decisionNote: null,
    status: "REQUESTED",
    requestedAt: REQUESTED_AT,
    resolvedAt: null,
    enrollmentId: "enrollment-1",
    learnerUserId: "user-1",
    courseTitle: "Excel avancé",
    learnerName: "Awa Kone",
    learnerEmail: "awa@example.com",
    paidAt: new Date(REQUESTED_AT.getTime() - 3 * DAY),
    ...overrides,
  };
}

const ELIGIBLE: RefundEligibilityData = { completedLessons: 1, totalLessons: 10, submittedAssessmentAttempts: 0, certificateIssued: false };

function setup(created: RefundRequest, data: RefundEligibilityData | Error) {
  const repository = {
    findRefundablePayment: jest.fn().mockResolvedValue({ paymentId: "payment-1", tenantId: "tenant-1", amount: 25000, currency: "XOF" }),
    hasActiveRequest: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue(created),
    save: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(created),
  } as unknown as jest.Mocked<RefundRequestRepositoryPort>;
  const emit = jest.fn();
  const eligibility: RefundEligibilityDataPort = {
    load: data instanceof Error ? jest.fn().mockRejectedValue(data) : jest.fn().mockResolvedValue(data),
  };
  const useCase = new RequestRefundUseCase(repository, { emit } as unknown as EventEmitter2, eligibility);
  return { repository, emit, useCase };
}

describe("RequestRefundUseCase — acceptation automatique (section 9.5)", () => {
  it("accepte automatiquement une demande éligible, fige les critères et prévient l'apprenant", async () => {
    const { useCase, repository, emit } = setup(request(), ELIGIBLE);
    const result = await useCase.execute({ userId: "user-1", enrollmentId: "enrollment-1" });

    expect(result).toMatchObject({ status: "ACCEPTED", decisionNote: AUTO_ACCEPT_NOTE, autoAccepted: true });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ACCEPTED",
        decisionNote: AUTO_ACCEPT_NOTE,
        autoAccepted: true,
        eligibility: expect.objectContaining({ eligible: true }),
      }),
    );
    const names = emit.mock.calls.map(([name]: [string]) => name);
    expect(names).toEqual(["refund-request.decided", "refund-request.requested"]);
    const decided = emit.mock.calls[0]?.[1] as RefundRequestDecidedEvent;
    expect(decided).toMatchObject({ learnerUserId: "user-1", outcome: "ACCEPTED", note: AUTO_ACCEPT_NOTE, amount: 25000 });
  });

  it.each([
    ["progression exactement 20 %", { completedLessons: 2, totalLessons: 10 }],
    ["un quiz soumis", { submittedAssessmentAttempts: 1 }],
    ["un certificat délivré", { certificateIssued: true }],
  ])("ne l'accepte pas automatiquement : %s ; elle suit le circuit de l'entreprise", async (_label, override) => {
    const { useCase, repository, emit } = setup(request(), { ...ELIGIBLE, ...override });
    const result = await useCase.execute({ userId: "user-1", enrollmentId: "enrollment-1" });

    expect(result).toMatchObject({ status: "REQUESTED", autoAccepted: false });
    expect(result.eligibility?.eligible).toBe(false);
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ status: "REQUESTED", autoAccepted: false }));
    expect(emit.mock.calls.map(([name]: [string]) => name)).toEqual(["refund-request.requested"]);
  });

  it("achat de plus de 7 jours : non éligible ; exactement 7 jours : éligible", async () => {
    const outside = setup(request({ paidAt: new Date(REQUESTED_AT.getTime() - 7 * DAY - 1) }), ELIGIBLE);
    expect((await outside.useCase.execute({ userId: "u", enrollmentId: "e" })).status).toBe("REQUESTED");
    const boundary = setup(request({ paidAt: new Date(REQUESTED_AT.getTime() - 7 * DAY) }), ELIGIBLE);
    expect((await boundary.useCase.execute({ userId: "u", enrollmentId: "e" })).status).toBe("ACCEPTED");
  });

  it("fail-closed : si les données de la politique sont indisponibles, jamais d'acceptation automatique", async () => {
    const { useCase, repository } = setup(request(), new Error("module indisponible"));
    const result = await useCase.execute({ userId: "u", enrollmentId: "e" });
    expect(result.status).toBe("REQUESTED");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("sans inscription rattachée, la demande reste manuelle", async () => {
    const { useCase } = setup(request({ enrollmentId: null }), ELIGIBLE);
    expect((await useCase.execute({ userId: "u", enrollmentId: "e" })).status).toBe("REQUESTED");
  });
});

describe("l'entreprise ne peut pas refuser une demande éligible (déjà acceptée)", () => {
  it("un refus après acceptation automatique est une transition invalide : rien n'est enregistré", async () => {
    const accepted = request({ status: "ACCEPTED", autoAccepted: true });
    const repository = { findById: jest.fn().mockResolvedValue(accepted), save: jest.fn() } as unknown as jest.Mocked<RefundRequestRepositoryPort>;
    const decide = new DecideRefundRequestUseCase(repository, { emit: jest.fn() } as unknown as EventEmitter2);
    await expect(
      decide.execute({ tenantId: "tenant-1", refundId: "refund-1", decision: "REJECT", note: "non" }),
    ).rejects.toThrow(InvalidStateTransitionError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
