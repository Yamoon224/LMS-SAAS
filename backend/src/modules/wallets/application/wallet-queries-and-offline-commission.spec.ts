import type { PlansFacade } from "@modules/plans/plans.facade";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import type { Payout } from "../domain/payout.entity";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import type { Transaction } from "../domain/transaction";
import type { TransactionRepositoryPort } from "../domain/transaction.repository.port";

import { GetPayoutUseCase } from "./get-payout.use-case";
import { GetSalesBreakdownUseCase } from "./get-sales-breakdown.use-case";
import { GetTenantBalanceUseCase } from "./get-tenant-balance.use-case";
import { ListPayoutsUseCase } from "./list-payouts.use-case";
import { ListTransactionsUseCase } from "./list-transactions.use-case";
import { RecordOfflineSaleCommissionUseCase } from "./record-offline-sale-commission.use-case";

describe("Lectures du module wallets", () => {
  it("GetPayout renvoie le reversement ou null", async () => {
    const payout = { id: "p1" } as Payout;
    const repo = { findById: jest.fn().mockResolvedValueOnce(payout).mockResolvedValueOnce(null) };
    const useCase = new GetPayoutUseCase(repo as unknown as PayoutRepositoryPort);
    await expect(useCase.execute("p1")).resolves.toBe(payout);
    await expect(useCase.execute("p2")).resolves.toBeNull();
    expect(repo.findById).toHaveBeenNthCalledWith(2, "p2");
  });

  it("ListPayouts filtre par statut (admin) ou par entreprise (ENT-69)", async () => {
    const rows = [{ id: "p1" }] as Payout[];
    const repo = {
      listByStatus: jest.fn().mockResolvedValue(rows),
      listByTenant: jest.fn().mockResolvedValue(rows),
    };
    const useCase = new ListPayoutsUseCase(repo as unknown as PayoutRepositoryPort);
    await expect(useCase.execute("REQUESTED")).resolves.toBe(rows);
    await expect(useCase.listForTenant("tenant-1")).resolves.toBe(rows);
    expect(repo.listByStatus).toHaveBeenCalledWith("REQUESTED");
    expect(repo.listByTenant).toHaveBeenCalledWith("tenant-1");
  });

  it("ListTransactions délègue au dépôt pour l'entreprise", async () => {
    const rows = [{ id: "t1" }] as unknown as Transaction[];
    const repo = { listForTenant: jest.fn().mockResolvedValue(rows) };
    await expect(new ListTransactionsUseCase(repo as unknown as TransactionRepositoryPort).execute("tenant-1")).resolves.toBe(rows);
    expect(repo.listForTenant).toHaveBeenCalledWith("tenant-1");
  });

  it("GetTenantBalance renvoie le solde du grand livre", async () => {
    const balance = { tenantId: "tenant-1", currency: "XOF", pendingAmount: 1, availableAmount: 2, payoutsExecutedAmount: 3 };
    const ledger = { getTenantBalance: jest.fn().mockResolvedValue(balance) };
    await expect(new GetTenantBalanceUseCase(ledger as unknown as LedgerRepositoryPort).execute("tenant-1")).resolves.toBe(balance);
    expect(ledger.getTenantBalance).toHaveBeenCalledWith("tenant-1");
  });

  it("GetSalesBreakdown résume les lignes du grand livre sur toute la période", async () => {
    const ledger = { listBreakdownRows: jest.fn().mockResolvedValue([]) };
    const result = await new GetSalesBreakdownUseCase(ledger as unknown as LedgerRepositoryPort).execute("tenant-1");
    const [tenantId, from, to] = ledger.listBreakdownRows.mock.calls[0] as [string, Date | null, Date];
    expect(tenantId).toBe("tenant-1");
    expect(from).toBeNull();
    expect(to.getUTCFullYear()).toBe(9999);
    expect(result).toMatchObject({ salesCount: 0, gross: 0, commission: 0, feeChargedToTenant: 0, net: 0, deductions: 0 });
  });
});

describe("RecordOfflineSaleCommissionUseCase (RG-24)", () => {
  function setup(commission: { percentRate: number | null; fixedAmount: number | null }) {
    const ledger = { record: jest.fn().mockResolvedValue(undefined) };
    const plans = { resolveCommission: jest.fn().mockResolvedValue(commission) };
    const useCase = new RecordOfflineSaleCommissionUseCase(
      ledger as unknown as LedgerRepositoryPort,
      plans as unknown as PlansFacade,
    );
    return { ledger, plans, useCase };
  }

  it("n'écrit rien quand aucune commission n'est due (défaut ADM-16)", async () => {
    const { ledger, plans, useCase } = setup({ percentRate: null, fixedAmount: null });
    await expect(useCase.execute({ tenantId: "tenant-1", enrollmentId: "enr-1", declaredAmount: 100_000 })).resolves.toBe(0);
    expect(plans.resolveCommission).toHaveBeenCalledWith("OFFLINE", "tenant-1");
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it("calcule une commission en pourcentage arrondie et l'écrit TENANT DEBIT / PLATFORM CREDIT", async () => {
    const { ledger, useCase } = setup({ percentRate: 7.5, fixedAmount: null });
    // 33 333 * 7,5 % = 2 499,975 -> 2 500
    await expect(useCase.execute({ tenantId: "tenant-1", enrollmentId: "enr-1", declaredAmount: 33_333 })).resolves.toBe(2_500);
    const input = ledger.record.mock.calls[0]?.[0];
    expect(input).toMatchObject({ tenantId: "tenant-1", currency: "XOF", sourceId: "enr-1" });
    expect(input.entries).toEqual([
      { account: "TENANT", direction: "DEBIT", amount: 2_500, sourceType: "OFFLINE_COMMISSION" },
      { account: "PLATFORM", direction: "CREDIT", amount: 2_500, sourceType: "OFFLINE_COMMISSION" },
    ]);
  });

  it("additionne la part en pourcentage et le montant fixe", async () => {
    const { useCase } = setup({ percentRate: 10, fixedAmount: 500 });
    await expect(useCase.execute({ tenantId: "t", enrollmentId: "e", declaredAmount: 20_000 })).resolves.toBe(2_500);
  });

  it("applique un montant fixe seul", async () => {
    const { ledger, useCase } = setup({ percentRate: null, fixedAmount: 1_000 });
    await expect(useCase.execute({ tenantId: "t", enrollmentId: "e", declaredAmount: 20_000 })).resolves.toBe(1_000);
    expect(ledger.record.mock.calls[0]?.[0].entries[0].amount).toBe(1_000);
  });
});
