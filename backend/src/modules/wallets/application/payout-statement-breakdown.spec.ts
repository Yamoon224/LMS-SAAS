import type { TenantsFacade } from "@modules/tenants/tenants.facade";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { resolveStatementWindow } from "../domain/payout-statement";
import type { PayoutStatementData } from "../domain/payout-statement";
import type { PayoutStatementRendererPort } from "../domain/payout-statement-renderer.port";
import { PayoutStatus } from "../domain/payout-status";
import { Payout } from "../domain/payout.entity";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { buildSaleLedgerEntries } from "../domain/sale-ledger-entries";
import { PdfKitPayoutStatementRendererAdapter } from "../infrastructure/pdfkit-payout-statement-renderer.adapter";

import { GeneratePayoutStatementUseCase } from "./generate-payout-statement.use-case";

function payout(id: string, requestedAt: string, status = PayoutStatus.EXECUTED): Payout {
  return Payout.fromPersistence({
    id,
    tenantId: "t1",
    amount: 43750,
    currency: "XOF",
    status,
    destination: { type: "BANK", accountNumber: "CI0123456789", accountName: "Acme" },
    validatedByUserId: "u1",
    approvedByUserId: "u2",
    proofUrl: "p",
    rejectionReason: null,
    requestedAt: new Date(requestedAt),
    executedAt: new Date(requestedAt),
  });
}

describe("resolveStatementWindow", () => {
  const first = payout("a", "2026-10-01T00:00:00Z");
  const second = payout("b", "2026-11-01T00:00:00Z");

  it("part du reversement exécuté précédent (exclu) jusqu'à la demande (incluse)", () => {
    expect(resolveStatementWindow(second, [first, second])).toEqual({ from: first.requestedAt, to: second.requestedAt });
  });

  it("premier reversement : depuis l'origine", () => {
    expect(resolveStatementWindow(first, [first, second])).toEqual({ from: null, to: first.requestedAt });
  });

  it("ignore un reversement précédent non exécuté (rejeté)", () => {
    const rejected = payout("r", "2026-10-15T00:00:00Z", PayoutStatus.REJECTED);
    expect(resolveStatementWindow(second, [first, rejected, second])?.from).toEqual(first.requestedAt);
  });
});

describe("GeneratePayoutStatementUseCase — ventilation", () => {
  it("transmet au rendu la ventilation brut / commission / frais / net de la fenêtre", async () => {
    const current = payout("b", "2026-11-01T00:00:00Z");
    const rows = buildSaleLedgerEntries({ grossAmount: 50000, commissionAmount: 5000, providerFee: 1250, feeChargedToTenant: true }).map(
      (entry) => ({ sourceId: "p1", ...entry }),
    );
    const ledger = { listBreakdownRows: jest.fn().mockResolvedValue(rows) } as unknown as LedgerRepositoryPort;
    const renderer: PayoutStatementRendererPort = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
    const useCase = new GeneratePayoutStatementUseCase(
      { findById: jest.fn().mockResolvedValue(current), listByTenant: jest.fn().mockResolvedValue([current]) } as unknown as PayoutRepositoryPort,
      renderer,
      { findById: jest.fn().mockResolvedValue({ name: "Acme" }) } as unknown as TenantsFacade,
      ledger,
    );

    await useCase.execute("t1", "b");

    expect(ledger.listBreakdownRows).toHaveBeenCalledWith("t1", null, current.requestedAt);
    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ breakdown: expect.objectContaining({ gross: 50000, commission: 5000, feeChargedToTenant: 1250, net: 43750 }) }),
    );
  });

  it("le PDF avec ventilation (y compris « non ventilé ») est produit", async () => {
    const data: PayoutStatementData = {
      number: "REL-1",
      tenantName: "Acme",
      amount: 43750,
      currency: "XOF",
      destinationType: "BANK",
      accountName: "Acme",
      accountNumberMasked: "••••6789",
      requestedAt: new Date("2026-11-01T00:00:00Z"),
      executedAt: new Date("2026-11-02T00:00:00Z"),
      breakdown: { salesCount: 2, gross: 60000, commission: 5000, feeChargedToTenant: 1250, unallocated: 6250, net: 47500, deductions: 3750 },
    };
    const buffer = await new PdfKitPayoutStatementRendererAdapter().render(data);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
