import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import { Payment } from "../domain/payment.entity";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import type { PendingPaymentRow, ReconciliationRepositoryPort } from "../domain/reconciliation.repository.port";
import type { WebhookEventLogPort, WebhookEventRecord } from "../domain/webhook-event-log.port";

import { ProcessWebhookUseCase } from "./process-webhook.use-case";
import {
  GetReconciliationOverviewUseCase,
  NotADuplicatePaymentError,
  PollPendingPaymentsUseCase,
  RefundDuplicatePaymentUseCase,
  ReplayWebhookUseCase,
  WebhookNotReplayableError,
} from "./reconciliation.use-cases";
import type { RefundPaymentUseCase } from "./refund-payment.use-case";

const NOW = new Date("2026-11-18T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function pendingPayment(id = "pay-1"): Payment {
  return Payment.fromPersistence({
    id,
    tenantId: "t1",
    providerId: "cfg-1",
    type: "COURSE_ENROLLMENT",
    method: "ORANGE_MONEY",
    amount: 25000,
    currency: "XOF",
    providerFee: 0,
    commissionAmount: 0,
    providerReference: `ref-${id}`,
    status: "PENDING",
    subscriptionId: null,
    enrollmentId: "enr-1",
    creditPackId: null,
  });
}

function row(id: string, age: number): PendingPaymentRow {
  return {
    id,
    tenantId: "t1",
    providerCode: "PAYSTACK",
    providerReference: `ref-${id}`,
    method: "ORANGE_MONEY",
    amount: 25000,
    currency: "XOF",
    createdAt: minutesAgo(age),
  };
}

function build(options: { verify?: jest.Mock; payments?: Record<string, Payment | null>; gateway?: PaymentGateway | null }) {
  const gateway =
    options.gateway === null
      ? null
      : ({ code: "PAYSTACK", verify: options.verify ?? jest.fn().mockResolvedValue({ status: "PENDING", providerFee: 0 }) } as unknown as PaymentGateway);
  const registry = { findByCode: jest.fn().mockResolvedValue(gateway) } as unknown as PaymentGatewayRegistryPort;
  const payments = options.payments ?? {};
  const paymentRepository = {
    findById: jest.fn(async (id: string) => payments[id] ?? null),
    findByProviderReference: jest.fn(async (_code: string, reference: string) => payments[reference.replace("ref-", "")] ?? null),
    save: jest.fn().mockResolvedValue(undefined),
  } as unknown as PaymentRepositoryPort;
  const emit = jest.fn();
  const eventLog = { record: jest.fn() } as unknown as WebhookEventLogPort;
  const processWebhook = new ProcessWebhookUseCase(registry, paymentRepository, { emit } as unknown as EventEmitter2, eventLog);
  return { registry, paymentRepository, emit, processWebhook, gateway };
}

function poll(rows: PendingPaymentRow[], ctx: ReturnType<typeof build>) {
  const reconciliation = { listPendingCreatedBefore: jest.fn().mockResolvedValue(rows) } as unknown as ReconciliationRepositoryPort;
  return new PollPendingPaymentsUseCase(reconciliation, ctx.paymentRepository, ctx.registry, ctx.processWebhook).execute(NOW);
}

describe("PollPendingPaymentsUseCase", () => {
  it("passe à SUCCEEDED un paiement confirmé par le fournisseur, via l'événement payment.succeeded", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment }, verify: jest.fn().mockResolvedValue({ status: "SUCCEEDED", providerFee: 600 }) });
    const report = await poll([row("pay-1", 5)], ctx);
    expect(report).toMatchObject({ checked: 1, succeeded: 1 });
    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.providerFee).toBe(600);
    expect(ctx.emit).toHaveBeenCalledWith("payment.succeeded", expect.anything());
  });

  it("passe à FAILED un paiement refusé par le fournisseur", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment }, verify: jest.fn().mockResolvedValue({ status: "FAILED", providerFee: 0 }) });
    expect((await poll([row("pay-1", 5)], ctx)).failed).toBe(1);
    expect(payment.status).toBe("FAILED");
    expect(ctx.emit).toHaveBeenCalledWith("payment.failed", expect.anything());
  });

  it("laisse en attente un paiement encore en attente chez le fournisseur avant 30 minutes", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment } });
    expect(await poll([row("pay-1", 29)], ctx)).toMatchObject({ stillPending: 1, expired: 0 });
    expect(payment.status).toBe("PENDING");
    expect(ctx.paymentRepository.save).not.toHaveBeenCalled();
  });

  it("expire (FAILED, motif « expiré ») un paiement toujours en attente à 30 minutes", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment } });
    expect(await poll([row("pay-1", 30)], ctx)).toMatchObject({ expired: 1 });
    expect(payment.status).toBe("FAILED");
    expect(payment.failureReason).toBe("expiré");
    expect(ctx.emit).toHaveBeenCalledWith("payment.failed", expect.anything());
  });

});

describe("PollPendingPaymentsUseCase — protections", () => {
  it("statut contradictoire : le webhook a déjà traité le paiement entre-temps, aucune seconde transition ni crédit", async () => {
    const alreadyDone = pendingPayment();
    alreadyDone.markSucceeded(600);
    const verify = jest.fn().mockResolvedValue({ status: "FAILED", providerFee: 0 });
    const ctx = build({ payments: { "pay-1": alreadyDone }, verify });
    const report = await poll([row("pay-1", 45)], ctx);
    expect(report.checked).toBe(0);
    expect(verify).not.toHaveBeenCalled();
    expect(alreadyDone.status).toBe("SUCCEEDED");
    expect(ctx.emit).not.toHaveBeenCalled();
  });

  it("fournisseur injoignable : le paiement n'est JAMAIS expiré (état réel inconnu), erreur comptée", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment }, verify: jest.fn().mockRejectedValue(new Error("timeout")) });
    expect(await poll([row("pay-1", 60)], ctx)).toMatchObject({ errors: 1, expired: 0 });
    expect(payment.status).toBe("PENDING");
  });

  it("ignore un paiement de moins de 2 minutes", async () => {
    const ctx = build({ payments: { "pay-1": pendingPayment() } });
    expect(await poll([row("pay-1", 1)], ctx)).toMatchObject({ checked: 0 });
  });

  it("une erreur sur un paiement n'empêche pas de traiter les suivants", async () => {
    const good = pendingPayment("pay-2");
    const verify = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ status: "SUCCEEDED", providerFee: 0 });
    const ctx = build({ payments: { "pay-1": pendingPayment("pay-1"), "pay-2": good }, verify });
    const report = await poll([row("pay-1", 5), row("pay-2", 6)], ctx);
    expect(report).toMatchObject({ errors: 1, succeeded: 1 });
    expect(good.status).toBe("SUCCEEDED");
  });
});

describe("ReplayWebhookUseCase", () => {
  const failure = (overrides: Partial<WebhookEventRecord> = {}): WebhookEventRecord => ({
    id: "wh-1",
    providerCode: "PAYSTACK",
    outcome: "ERROR",
    receivedAt: minutesAgo(5),
    providerReference: "ref-pay-1",
    resolvedAt: null,
    ...overrides,
  });

  function replay(event: WebhookEventRecord | null, ctx: ReturnType<typeof build>) {
    const eventLog = {
      findById: jest.fn().mockResolvedValue(event),
      markResolved: jest.fn().mockResolvedValue(undefined),
    } as unknown as WebhookEventLogPort;
    const useCase = new ReplayWebhookUseCase(eventLog, ctx.paymentRepository, ctx.registry, ctx.processWebhook, { emit: ctx.emit } as unknown as EventEmitter2);
    return { useCase, eventLog };
  }

  it("re-traite un webhook en échec : paiement confirmé, journal résolu, rejeu audité par un événement", async () => {
    const payment = pendingPayment();
    const ctx = build({ payments: { "pay-1": payment }, verify: jest.fn().mockResolvedValue({ status: "SUCCEEDED", providerFee: 0 }) });
    const { useCase, eventLog } = replay(failure(), ctx);
    expect(await useCase.execute("wh-1", "admin-1")).toEqual({ outcome: "PROCESSED" });
    expect(payment.status).toBe("SUCCEEDED");
    expect(eventLog.markResolved).toHaveBeenCalledWith("wh-1");
    expect(ctx.emit).toHaveBeenCalledWith(
      "payment.webhook-replayed",
      expect.objectContaining({ webhookEventId: "wh-1", outcome: "PROCESSED", actorUserId: "admin-1" }),
    );
  });

  it("idempotent : rejouer un webhook dont le paiement est déjà traité ne crédite rien une seconde fois", async () => {
    const done = pendingPayment();
    done.markSucceeded(0);
    const verify = jest.fn();
    const ctx = build({ payments: { "pay-1": done }, verify });
    const { useCase } = replay(failure(), ctx);
    expect(await useCase.execute("wh-1", "admin-1")).toEqual({ outcome: "DUPLICATE" });
    expect(verify).not.toHaveBeenCalled();
    expect(ctx.emit).not.toHaveBeenCalledWith("payment.succeeded", expect.anything());
  });

  it("référence toujours inconnue : reste non résolu (rejouable plus tard)", async () => {
    const ctx = build({ payments: {} });
    const { useCase, eventLog } = replay(failure({ outcome: "UNKNOWN_REFERENCE" }), ctx);
    expect(await useCase.execute("wh-1", "admin-1")).toEqual({ outcome: "UNKNOWN_REFERENCE" });
    expect(eventLog.markResolved).not.toHaveBeenCalled();
  });

  it("refuse un webhook déjà traité, à signature invalide, ou sans référence conservée", async () => {
    const ctx = build({ payments: { "pay-1": pendingPayment() } });
    for (const event of [failure({ outcome: "PROCESSED" }), failure({ outcome: "INVALID_SIGNATURE" }), failure({ outcome: "DUPLICATE" })]) {
      await expect(replay(event, ctx).useCase.execute("wh-1", "a")).rejects.toThrow(WebhookNotReplayableError);
    }
    await expect(replay(failure({ providerReference: null }), ctx).useCase.execute("wh-1", "a")).rejects.toThrow(WebhookNotReplayableError);
  });

  it("webhook inconnu : 404", async () => {
    const ctx = build({});
    await expect(replay(null, ctx).useCase.execute("nope", "a")).rejects.toThrow(NotFoundDomainError);
  });
});

describe("rapprochement : vue d'ensemble et doublons", () => {
  const candidate = (id: string, minutes: number) => ({
    paymentId: id,
    tenantId: "t1",
    amount: 25000,
    currency: "XOF",
    userId: "u1",
    courseId: "c1",
    createdAt: minutesAgo(minutes),
  });

  it("agrège paiements anciens, webhooks en échec (rejouables ou non) et doublons suspects", async () => {
    const reconciliation = {
      listPendingCreatedBefore: jest.fn().mockResolvedValue([row("pay-9", 40)]),
      listCollectedEnrollmentPaymentsSince: jest.fn().mockResolvedValue([candidate("a", 12), candidate("b", 9)]),
    } as unknown as ReconciliationRepositoryPort;
    const eventLog = {
      listUnresolvedFailures: jest.fn().mockResolvedValue([
        { id: "w1", providerCode: "PAYSTACK", outcome: "ERROR", receivedAt: NOW, providerReference: "r", resolvedAt: null },
        { id: "w2", providerCode: "PAYSTACK", outcome: "ERROR", receivedAt: NOW, providerReference: null, resolvedAt: null },
      ]),
    } as unknown as WebhookEventLogPort;
    const overview = await new GetReconciliationOverviewUseCase(reconciliation, eventLog).execute(NOW);
    expect(overview.stalePendingPayments).toHaveLength(1);
    expect(overview.webhookFailures.map((w) => w.replayable)).toEqual([true, false]);
    expect(overview.suspectedDuplicates).toEqual([expect.objectContaining({ paymentId: "b", originalPaymentId: "a" })]);
  });

  function refundSetup(candidates: ReturnType<typeof candidate>[]) {
    const reconciliation = { listCollectedEnrollmentPaymentsSince: jest.fn().mockResolvedValue(candidates) } as unknown as ReconciliationRepositoryPort;
    const paymentRepository = { findById: jest.fn().mockResolvedValue(pendingPayment("b")) } as unknown as PaymentRepositoryPort;
    const refund = { execute: jest.fn().mockResolvedValue(undefined) };
    return { useCase: new RefundDuplicatePaymentUseCase(reconciliation, paymentRepository, refund as unknown as RefundPaymentUseCase), refund };
  }

  it("rembourse intégralement le doublon, jamais l'original", async () => {
    const { useCase, refund } = refundSetup([candidate("a", 12), candidate("b", 9)]);
    await useCase.execute("b", NOW);
    expect(refund.execute).toHaveBeenCalledWith("b", 25000, "Paiement en double");
    await expect(useCase.execute("a", NOW)).rejects.toThrow(NotADuplicatePaymentError);
  });

  it("refuse de rembourser un paiement légitime distinct (autre formation) ou déjà remboursé", async () => {
    const other = { ...candidate("b", 9), courseId: "c2" };
    const { useCase, refund } = refundSetup([candidate("a", 12), other]);
    await expect(useCase.execute("b", NOW)).rejects.toThrow(NotADuplicatePaymentError);
    // Après remboursement, le doublon sort des candidats : un second appel ne rembourse pas une seconde fois.
    const afterRefund = refundSetup([candidate("a", 12)]);
    await expect(afterRefund.useCase.execute("b", NOW)).rejects.toThrow(NotADuplicatePaymentError);
    expect(refund.execute).not.toHaveBeenCalled();
    expect(afterRefund.refund.execute).not.toHaveBeenCalled();
  });
});
