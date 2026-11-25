import type { PlatformSettingsFacade } from "@modules/platform-settings/platform-settings.facade";
import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError } from "@shared/errors/domain-error";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";

import { RequestPayoutUseCase } from "./request-payout.use-case";

class NotVerified extends DomainError {
  readonly code = "COMPTE_REVERSEMENT_NON_VERIFIE";
}

function setup(verified: boolean) {
  const create = jest.fn(async (data: { destination: unknown }) => ({ id: "p1", amount: 50000, status: "REQUESTED", ...data }));
  const ledger = { getTenantBalance: jest.fn(async () => ({ availableAmount: 50000, currency: "XOF", pendingAmount: 0, payoutsExecutedAmount: 0 })) };
  const tenants = {
    getVerifiedPayoutDestination: jest.fn(async () => {
      if (!verified) throw new NotVerified("non vérifié");
      return { type: "BANK", accountNumber: "FR7630006000011234567890189", accountName: "Acme" };
    }),
  };
  const emit = jest.fn();
  const useCase = new RequestPayoutUseCase(
    ledger as unknown as LedgerRepositoryPort,
    { create, hasOpenPayout: jest.fn(async () => false) } as unknown as PayoutRepositoryPort,
    { emit } as unknown as EventEmitter2,
    tenants as unknown as TenantsFacade,
    { getFinanceSettings: jest.fn(async () => ({ minimumPayoutThreshold: 10000 })) } as unknown as PlatformSettingsFacade,
  );
  return { useCase, create, emit };
}

describe("RequestPayoutUseCase (ENT-11 / RG-23)", () => {
  it("refuse le reversement tant que le compte n'est pas vérifié : rien n'est créé ni émis", async () => {
    const { useCase, create, emit } = setup(false);
    await expect(useCase.execute("t1")).rejects.toMatchObject({ code: "COMPTE_REVERSEMENT_NON_VERIFIE" });
    expect(create).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("avec un compte vérifié, la destination est le compte enregistré", async () => {
    const { useCase, create } = setup(true);
    await useCase.execute("t1");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ destination: { type: "BANK", accountNumber: "FR7630006000011234567890189", accountName: "Acme" } }),
    );
  });
});
