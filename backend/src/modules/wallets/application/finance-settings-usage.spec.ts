import type { PaymentSucceededEvent } from "@modules/payments/payments.events";
import type { PlansFacade } from "@modules/plans/plans.facade";
import type { FinanceSettings, PlatformSettingsFacade } from "@modules/platform-settings/platform-settings.facade";
import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors/domain-error";

import type { LedgerRepositoryPort, RecordLedgerEntriesInput } from "../domain/ledger.repository.port";
import { isAutomaticPayoutDay } from "../domain/payout-schedule";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";

import { RecordSaleToLedgerListener } from "./record-sale-to-ledger.listener";
import { PayoutAlreadyOpenError, PayoutBelowThresholdError, RequestPayoutUseCase } from "./request-payout.use-case";
import { RunAutomaticPayoutsUseCase } from "./run-automatic-payouts.use-case";

const DEFAULTS: FinanceSettings = {
  retentionDays: 7,
  minimumPayoutThreshold: 10000,
  payoutFrequency: "MANUAL",
  transactionFeeBearer: "TENANT",
};
const settingsFacade = (overrides: Partial<FinanceSettings> = {}) =>
  ({ getFinanceSettings: jest.fn(async () => ({ ...DEFAULTS, ...overrides })) }) as unknown as PlatformSettingsFacade;

describe("RecordSaleToLedgerListener — paramètres lus à l'usage", () => {
  function run(settings: Partial<FinanceSettings>, currency = "XOF") {
    const recorded: RecordLedgerEntriesInput[] = [];
    const ledger = { record: jest.fn(async (input: RecordLedgerEntriesInput) => void recorded.push(input)) } as unknown as LedgerRepositoryPort;
    const plans = { resolveCommission: jest.fn(async () => ({ percentRate: 10, fixedAmount: null })) } as unknown as PlansFacade;
    const listener = new RecordSaleToLedgerListener(ledger, plans, settingsFacade(settings));
    const payment = { id: "p1", tenantId: "t1", type: "COURSE_ENROLLMENT", amount: 50000, providerFee: 1250, currency };
    return listener.handle({ payment } as unknown as PaymentSucceededEvent).then(() => recorded[0] as RecordLedgerEntriesInput);
  }
  const tenantCredit = (input: RecordLedgerEntriesInput) =>
    input.entries.find((e) => e.account === "TENANT" && e.direction === "CREDIT")?.amount;

  it("applique la rétention des paramètres et la devise du paiement (plus de XOF codé en dur)", async () => {
    const before = Date.now();
    const input = await run({ retentionDays: 30 }, "EUR");
    expect(input.currency).toBe("EUR");
    const days = (input.availableAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("une rétention de 0 jour rend la vente disponible tout de suite", async () => {
    const before = Date.now();
    const input = await run({ retentionDays: 0 });
    expect(input.availableAt.getTime() - before).toBeLessThan(5000);
  });

  it("frais à la charge de l'entreprise : net 43 750 ; à la charge de la plateforme : net 45 000", async () => {
    expect(tenantCredit(await run({ transactionFeeBearer: "TENANT" }))).toBe(43750);
    expect(tenantCredit(await run({ transactionFeeBearer: "PLATFORM" }))).toBe(45000);
  });

  it("une vente déjà comptabilisée n'est jamais recalculée : l'écriture porte sa propre date et son propre net", async () => {
    const first = await run({ retentionDays: 7, transactionFeeBearer: "TENANT" });
    const later = await run({ retentionDays: 60, transactionFeeBearer: "PLATFORM" });
    expect(first.availableAt.getTime()).toBeLessThan(later.availableAt.getTime());
    expect(tenantCredit(first)).toBe(43750); // inchangé par le changement de paramètres survenu ensuite
  });
});

describe("RequestPayoutUseCase — seuil des paramètres et demande unique", () => {
  function setup(opts: { available: number; open?: boolean; settings?: Partial<FinanceSettings> }) {
    const create = jest.fn(async (data: object) => ({ id: "p1", amount: opts.available, status: "REQUESTED", ...data }));
    const emit = jest.fn();
    const useCase = new RequestPayoutUseCase(
      { getTenantBalance: jest.fn(async () => ({ availableAmount: opts.available, currency: "XOF" })) } as unknown as LedgerRepositoryPort,
      { create, hasOpenPayout: jest.fn(async () => opts.open ?? false) } as unknown as PayoutRepositoryPort,
      { emit } as unknown as EventEmitter2,
      { getVerifiedPayoutDestination: jest.fn(async () => ({ type: "BANK", accountNumber: "1234", accountName: "A" })) } as unknown as TenantsFacade,
      settingsFacade(opts.settings),
    );
    return { useCase, create, emit };
  }

  it("utilise le seuil des paramètres : 9 999 refusé, 10 000 accepté (défaut)", async () => {
    await expect(setup({ available: 9999 }).useCase.execute("t1")).rejects.toThrow(PayoutBelowThresholdError);
    await expect(setup({ available: 10000 }).useCase.execute("t1")).resolves.toBeDefined();
  });

  it("un seuil abaissé par l'Admin est respecté", async () => {
    await expect(setup({ available: 5000, settings: { minimumPayoutThreshold: 5000 } }).useCase.execute("t1")).resolves.toBeDefined();
  });

  it("refuse une seconde demande tant qu'une demande est ouverte : rien n'est créé", async () => {
    const { useCase, create, emit } = setup({ available: 50000, open: true });
    await expect(useCase.execute("t1")).rejects.toThrow(PayoutAlreadyOpenError);
    expect(create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("marque l'événement comme automatique pour une demande du système", async () => {
    const { useCase, emit } = setup({ available: 50000 });
    await useCase.execute("t1", undefined, true);
    expect(emit).toHaveBeenCalledWith("payout.requested", expect.objectContaining({ tenantId: "t1", automatic: true }));
  });
});

describe("isAutomaticPayoutDay", () => {
  it("MANUAL ne déclenche jamais", () => {
    expect(isAutomaticPayoutDay("MANUAL", new Date("2026-11-02T06:00:00Z"))).toBe(false);
  });
  it("WEEKLY : le lundi seulement", () => {
    expect(isAutomaticPayoutDay("WEEKLY", new Date("2026-11-16T06:00:00Z"))).toBe(true); // lundi
    expect(isAutomaticPayoutDay("WEEKLY", new Date("2026-11-17T06:00:00Z"))).toBe(false);
  });
  it("MONTHLY : le 1er seulement", () => {
    expect(isAutomaticPayoutDay("MONTHLY", new Date("2026-12-01T06:00:00Z"))).toBe(true);
    expect(isAutomaticPayoutDay("MONTHLY", new Date("2026-12-02T06:00:00Z"))).toBe(false);
  });
});

describe("RunAutomaticPayoutsUseCase", () => {
  class Unverified extends DomainError {
    readonly code = "COMPTE_REVERSEMENT_NON_VERIFIE";
  }
  const monday = new Date("2026-11-16T06:00:00Z");
  const tenants = (...ids: string[]) =>
    ({ listAll: jest.fn(async () => ids.map((id) => ({ id, isOperational: () => true }))) }) as unknown as TenantsFacade;

  it("ne fait rien en mode MANUAL", async () => {
    const request = { execute: jest.fn() };
    const report = await new RunAutomaticPayoutsUseCase(settingsFacade({ payoutFrequency: "MANUAL" }), tenants("a"), request as unknown as RequestPayoutUseCase).execute(monday);
    expect(report.ran).toBe(false);
    expect(request.execute).not.toHaveBeenCalled();
  });

  it("ne fait rien un jour hors vague", async () => {
    const request = { execute: jest.fn() };
    const report = await new RunAutomaticPayoutsUseCase(settingsFacade({ payoutFrequency: "WEEKLY" }), tenants("a"), request as unknown as RequestPayoutUseCase).execute(new Date("2026-11-18T06:00:00Z"));
    expect(report.ran).toBe(false);
    expect(request.execute).not.toHaveBeenCalled();
  });

  it("crée une demande par entreprise éligible, ignore compte non vérifié, sous le seuil et demande déjà ouverte", async () => {
    const request = {
      execute: jest.fn(async (tenantId: string) => {
        if (tenantId === "unverified") throw new Unverified("non vérifié");
        if (tenantId === "low") throw new PayoutBelowThresholdError("sous le seuil");
        if (tenantId === "open") throw new PayoutAlreadyOpenError("déjà ouverte");
        if (tenantId === "boom") throw new Error("panne");
        return { id: `payout-${tenantId}` };
      }),
    };
    const useCase = new RunAutomaticPayoutsUseCase(
      settingsFacade({ payoutFrequency: "WEEKLY", minimumPayoutThreshold: 20000 }),
      tenants("ok", "unverified", "low", "open", "boom", "ok2"),
      request as unknown as RequestPayoutUseCase,
    );
    const report = await useCase.execute(monday);
    expect(report).toMatchObject({ ran: true, created: 2 });
    expect(report.skipped.map((s) => s.reason)).toEqual([
      "COMPTE_REVERSEMENT_NON_VERIFIE",
      "REVERSEMENT_SOUS_LE_SEUIL",
      "REVERSEMENT_DEJA_OUVERT",
      "ERREUR_INATTENDUE",
    ]);
    // Seuil des paramètres transmis ; demande marquée automatique (auteur « système »).
    expect(request.execute).toHaveBeenCalledWith("ok", 20000, true);
  });

});

describe("RunAutomaticPayoutsUseCase — idempotence", () => {
  const monday = new Date("2026-11-16T06:00:00Z");
  const tenants = (...ids: string[]) =>
    ({ listAll: jest.fn(async () => ids.map((id) => ({ id, isOperational: () => true }))) }) as unknown as TenantsFacade;

  it("est idempotente : un second passage le même jour ne crée rien de plus (demande déjà ouverte)", async () => {
    const open = new Set<string>();
    const request = {
      execute: jest.fn(async (tenantId: string) => {
        if (open.has(tenantId)) throw new PayoutAlreadyOpenError("déjà ouverte");
        open.add(tenantId);
        return { id: "p" };
      }),
    };
    const useCase = new RunAutomaticPayoutsUseCase(settingsFacade({ payoutFrequency: "WEEKLY" }), tenants("a", "b"), request as unknown as RequestPayoutUseCase);
    expect((await useCase.execute(monday)).created).toBe(2);
    expect((await useCase.execute(monday)).created).toBe(0);
  });

  it("n'interroge pas les entreprises non opérationnelles", async () => {
    const request = { execute: jest.fn(async () => ({ id: "p" })) };
    const t = { listAll: jest.fn(async () => [{ id: "x", isOperational: () => false }]) } as unknown as TenantsFacade;
    await new RunAutomaticPayoutsUseCase(settingsFacade({ payoutFrequency: "WEEKLY" }), t, request as unknown as RequestPayoutUseCase).execute(monday);
    expect(request.execute).not.toHaveBeenCalled();
  });
});
