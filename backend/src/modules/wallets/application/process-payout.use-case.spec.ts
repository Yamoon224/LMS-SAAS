import type { EventEmitter2 } from "@nestjs/event-emitter";
import { InvalidStateTransitionError, NotFoundDomainError } from "@shared/errors";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { Payout } from "../domain/payout.entity";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { PayoutStatus } from "../domain/payout-status";
import type { PayoutExecutedEvent } from "../wallets.events";

import { ProcessPayoutUseCase } from "./process-payout.use-case";

const build = (status: PayoutStatus, validatedByUserId: string | null = null) =>
  Payout.fromPersistence({
    id: "payout-1",
    tenantId: "tenant-1",
    amount: 120_000,
    currency: "XOF",
    status,
    destination: { type: "BANK", accountNumber: "FR76", accountName: "Acme" },
    validatedByUserId,
    approvedByUserId: null,
    proofUrl: null,
    rejectionReason: null,
  });

function setup(payout: Payout | null) {
  const payouts = {
    findById: jest.fn().mockResolvedValue(payout),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const ledger = { record: jest.fn().mockResolvedValue(undefined) };
  const events = { emit: jest.fn() };
  const useCase = new ProcessPayoutUseCase(
    payouts as unknown as PayoutRepositoryPort,
    ledger as unknown as LedgerRepositoryPort,
    events as unknown as EventEmitter2,
  );
  return { payouts, ledger, events, useCase };
}

describe("ProcessPayoutUseCase", () => {
  it("validate : passe en VALIDATED et persiste", async () => {
    const payout = build(PayoutStatus.REQUESTED);
    const { payouts, useCase } = setup(payout);
    await useCase.validate("payout-1", "operator-1");
    expect(payout.status).toBe(PayoutStatus.VALIDATED);
    expect(payout.toSnapshot().validatedByUserId).toBe("operator-1");
    expect(payouts.save).toHaveBeenCalledWith(payout);
  });

  it("approve : exige une personne différente de l'opérateur et ne persiste pas en cas de refus", async () => {
    const payout = build(PayoutStatus.VALIDATED, "operator-1");
    const { payouts, useCase } = setup(payout);
    await expect(useCase.approve("payout-1", "operator-1")).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(payouts.save).not.toHaveBeenCalled();

    await useCase.approve("payout-1", "finance-1");
    expect(payout.status).toBe(PayoutStatus.APPROVED);
    expect(payouts.save).toHaveBeenCalledWith(payout);
  });

  it("execute : enregistre au grand livre TENANT DEBIT / EXTERNAL CREDIT du montant exact puis publie payout.executed", async () => {
    const payout = build(PayoutStatus.APPROVED, "operator-1");
    const { payouts, ledger, events, useCase } = setup(payout);

    await useCase.execute("payout-1", "https://proof/1.pdf");

    expect(payout.status).toBe(PayoutStatus.EXECUTED);
    expect(payouts.save).toHaveBeenCalledWith(payout);
    expect(ledger.record).toHaveBeenCalledTimes(1);
    const recorded = ledger.record.mock.calls[0]?.[0];
    expect(recorded).toMatchObject({ tenantId: "tenant-1", currency: "XOF", sourceId: "payout-1" });
    expect(recorded.availableAt).toBeInstanceOf(Date);
    expect(recorded.entries).toEqual([
      { account: "TENANT", direction: "DEBIT", amount: 120_000, sourceType: "PAYOUT" },
      { account: "EXTERNAL", direction: "CREDIT", amount: 120_000, sourceType: "PAYOUT" },
    ]);
    const [name, payload] = events.emit.mock.calls[0] as [string, PayoutExecutedEvent];
    expect(name).toBe("payout.executed");
    expect(payload).toMatchObject({ payoutId: "payout-1", tenantId: "tenant-1" });
  });

  it("execute : n'écrit ni au grand livre ni d'événement si le reversement n'est pas APPROVED", async () => {
    const { payouts, ledger, events, useCase } = setup(build(PayoutStatus.VALIDATED));
    await expect(useCase.execute("payout-1", "proof")).rejects.toBeInstanceOf(InvalidStateTransitionError);
    expect(payouts.save).not.toHaveBeenCalled();
    expect(ledger.record).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("reject : conserve le motif et persiste", async () => {
    const payout = build(PayoutStatus.VALIDATED, "operator-1");
    const { payouts, ledger, useCase } = setup(payout);
    await useCase.reject("payout-1", "Compte inconnu");
    expect(payout.status).toBe(PayoutStatus.REJECTED);
    expect(payout.toSnapshot().rejectionReason).toBe("Compte inconnu");
    expect(payouts.save).toHaveBeenCalledWith(payout);
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it.each(["validate", "approve", "execute", "reject"] as const)("%s : lève NotFoundDomainError pour un reversement inconnu", async (method) => {
    const { payouts, ledger, useCase } = setup(null);
    await expect(useCase[method]("nope", "x")).rejects.toBeInstanceOf(NotFoundDomainError);
    expect(payouts.save).not.toHaveBeenCalled();
    expect(ledger.record).not.toHaveBeenCalled();
  });
});
