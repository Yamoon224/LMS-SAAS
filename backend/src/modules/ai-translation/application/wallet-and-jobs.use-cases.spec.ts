import type { PaymentsFacade } from "@modules/payments/payments.facade";
import type { PlansFacade } from "@modules/plans/plans.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import { TranslationConfirmedEvent } from "../ai-translation.events";
import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CreditWallet } from "../domain/credit-wallet.entity";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";
import { InsufficientCreditsError } from "../domain/insufficient-credits.error";
import { TranslationJobStatus } from "../domain/translation-job-status";
import { TranslationJob } from "../domain/translation-job.entity";
import type { TranslationJobRepositoryPort } from "../domain/translation-job.repository.port";

import { ConfirmTranslationUseCase } from "./confirm-translation.use-case";
import { GetWalletBalanceUseCase } from "./get-wallet-balance.use-case";
import { ListLedgerUseCase } from "./list-ledger.use-case";
import { ListTranslationJobsUseCase } from "./list-translation-jobs.use-case";
import { PurchaseCreditPackUseCase } from "./purchase-credit-pack.use-case";

const job = (id: string, tenantId: string, estimatedCredits: number | null = 30) =>
  TranslationJob.fromPersistence({
    id,
    tenantId,
    courseId: "c1",
    targetLocale: "en",
    wordCount: 10,
    estimatedCredits,
    debitedCredits: null,
    status: TranslationJobStatus.ESTIMATED,
    errorMessage: null,
    createdAt: new Date(),
    completedAt: null,
  });

describe("ConfirmTranslationUseCase", () => {
  function setup(found: TranslationJob | null, wallet: CreditWallet | null) {
    const fresh = CreditWallet.fromPersistence({ id: "w-new", tenantId: "t1", balance: 0 });
    const jobs = {
      findById: jest.fn().mockResolvedValue(found),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TranslationJobRepositoryPort>;
    const wallets = {
      findByTenantId: jest.fn().mockResolvedValue(wallet),
      createForTenant: jest.fn().mockResolvedValue(fresh),
      save: jest.fn().mockResolvedValue(undefined),
      recordLedgerEntry: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditWalletRepositoryPort>;
    const emitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    return { useCase: new ConfirmTranslationUseCase(jobs, wallets, emitter), jobs, wallets, emitter };
  }

  it.each([
    ["job introuvable", null],
    ["job d'un autre tenant", job("j1", "autre")],
  ])("404 pour %s, sans débit", async (_l, found) => {
    const { useCase, wallets, emitter } = setup(found, null);
    await expect(useCase.execute("j1", "t1")).rejects.toThrow(NotFoundDomainError);
    expect(wallets.save).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("débite, trace, confirme le job et émet l'événement", async () => {
    const j = job("j1", "t1", 30);
    const wallet = CreditWallet.fromPersistence({ id: "w1", tenantId: "t1", balance: 100 });
    const { useCase, jobs, wallets, emitter } = setup(j, wallet);

    await useCase.execute("j1", "t1");

    expect(wallet.balance).toBe(70);
    expect(wallets.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: "w1", type: CreditLedgerType.DEBIT, amount: -30, translationJobId: "j1" }),
    );
    expect(j.status).toBe(TranslationJobStatus.CONFIRMED);
    expect(j.debitedCredits).toBe(30);
    expect(jobs.save).toHaveBeenCalledWith(j);
    expect(emitter.emit).toHaveBeenCalledWith("translation.confirmed", new TranslationConfirmedEvent("j1"));
  });

  it("crée un portefeuille vide puis refuse faute de crédits, sans confirmer", async () => {
    const j = job("j1", "t1", 30);
    const { useCase, wallets, jobs, emitter } = setup(j, null);
    await expect(useCase.execute("j1", "t1")).rejects.toThrow(InsufficientCreditsError);
    expect(wallets.createForTenant).toHaveBeenCalledWith("t1");
    expect(jobs.save).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("traite une estimation absente comme 0 crédit", async () => {
    const j = job("j1", "t1", null);
    const wallet = CreditWallet.fromPersistence({ id: "w1", tenantId: "t1", balance: 0 });
    const { useCase } = setup(j, wallet);
    await useCase.execute("j1", "t1");
    expect(j.debitedCredits).toBe(0);
  });
});

describe("GetWalletBalanceUseCase", () => {
  it("retourne le solde du portefeuille, 0 s'il n'existe pas", async () => {
    const findByTenantId = jest
      .fn()
      .mockResolvedValueOnce(CreditWallet.fromPersistence({ id: "w", tenantId: "t1", balance: 42 }))
      .mockResolvedValueOnce(null);
    const useCase = new GetWalletBalanceUseCase({ findByTenantId } as unknown as CreditWalletRepositoryPort);
    await expect(useCase.execute("t1")).resolves.toBe(42);
    await expect(useCase.execute("t2")).resolves.toBe(0);
  });
});

describe("ListLedgerUseCase", () => {
  it("délègue au repository avec le tenant", async () => {
    const entries = [{ id: "e1", type: CreditLedgerType.PURCHASE, amount: 5, note: null, createdAt: new Date() }];
    const listLedgerForTenant = jest.fn().mockResolvedValue(entries);
    const useCase = new ListLedgerUseCase({ listLedgerForTenant } as unknown as CreditWalletRepositoryPort);
    await expect(useCase.execute("t1")).resolves.toBe(entries);
    expect(listLedgerForTenant).toHaveBeenCalledWith("t1");
  });
});

describe("ListTranslationJobsUseCase", () => {
  it("filtre les jobs d'une formation sur le tenant de l'appelant", async () => {
    const own = job("j1", "t1");
    const listByCourse = jest.fn().mockResolvedValue([own, job("j2", "autre")]);
    const useCase = new ListTranslationJobsUseCase({ listByCourse } as unknown as TranslationJobRepositoryPort);
    await expect(useCase.listForCourse("c1", "t1")).resolves.toEqual([own]);
  });

  it("liste les jobs du tenant", async () => {
    const jobs = [job("j1", "t1")];
    const listByTenant = jest.fn().mockResolvedValue(jobs);
    const useCase = new ListTranslationJobsUseCase({ listByTenant } as unknown as TranslationJobRepositoryPort);
    await expect(useCase.listForTenant("t1")).resolves.toBe(jobs);
    expect(listByTenant).toHaveBeenCalledWith("t1");
  });
});

describe("PurchaseCreditPackUseCase", () => {
  it("404 si le pack n'existe pas, sans initier de paiement", async () => {
    const initiatePayment = jest.fn();
    const useCase = new PurchaseCreditPackUseCase(
      { findCreditPack: jest.fn().mockResolvedValue(null) } as unknown as PlansFacade,
      { initiatePayment } as unknown as PaymentsFacade,
    );
    await expect(useCase.execute({ tenantId: "t1", creditPackId: "p", method: "CARD" })).rejects.toThrow(
      NotFoundDomainError,
    );
    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("initie un paiement CREDIT_PURCHASE au prix du pack", async () => {
    const result = { id: "pay-1" };
    const initiatePayment = jest.fn().mockResolvedValue(result);
    const useCase = new PurchaseCreditPackUseCase(
      { findCreditPack: jest.fn().mockResolvedValue({ id: "p", price: 5000, currency: "XOF" }) } as unknown as PlansFacade,
      { initiatePayment } as unknown as PaymentsFacade,
    );
    await expect(
      useCase.execute({ tenantId: "t1", creditPackId: "p", method: "WAVE", customerEmail: "a@b.c", callbackUrl: "u" }),
    ).resolves.toBe(result);
    expect(initiatePayment).toHaveBeenCalledWith({
      tenantId: "t1",
      type: "CREDIT_PURCHASE",
      method: "WAVE",
      amount: 5000,
      currency: "XOF",
      objectId: "p",
      creditPackId: "p",
      customerEmail: "a@b.c",
      callbackUrl: "u",
    });
  });
});
