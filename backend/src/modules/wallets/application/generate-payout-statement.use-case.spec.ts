import type { TenantsFacade } from "@modules/tenants/tenants.facade";
import { NotFoundDomainError } from "@shared/errors";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";
import { buildPayoutStatementNumber } from "../domain/payout-statement";
import type { PayoutStatementRendererPort } from "../domain/payout-statement-renderer.port";
import { PayoutStatus } from "../domain/payout-status";
import { Payout } from "../domain/payout.entity";
import type { PayoutRepositoryPort } from "../domain/payout.repository.port";
import { PdfKitPayoutStatementRendererAdapter } from "../infrastructure/pdfkit-payout-statement-renderer.adapter";

import { GeneratePayoutStatementUseCase, PayoutStatementUnavailableError } from "./generate-payout-statement.use-case";

const PAYOUT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function buildPayout(overrides: { tenantId?: string; status?: PayoutStatus } = {}): Payout {
  return Payout.fromPersistence({
    id: PAYOUT_ID,
    tenantId: overrides.tenantId ?? "tenant-1",
    amount: 120000,
    currency: "XOF",
    status: overrides.status ?? PayoutStatus.EXECUTED,
    destination: { type: "BANK", accountNumber: "CI0123456789", accountName: "Acme SARL" },
    validatedByUserId: "u1",
    approvedByUserId: "u2",
    proofUrl: "proof",
    rejectionReason: null,
    requestedAt: new Date("2026-11-01T00:00:00Z"),
    executedAt: new Date("2026-11-05T00:00:00Z"),
  });
}

function build(payout: Payout | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue(payout),
    listByTenant: jest.fn().mockResolvedValue(payout ? [payout] : []),
  } as unknown as PayoutRepositoryPort;
  const ledger = { listBreakdownRows: jest.fn().mockResolvedValue([]) } as unknown as LedgerRepositoryPort;
  const renderer: PayoutStatementRendererPort = { render: jest.fn().mockResolvedValue(Buffer.from("pdf")) };
  const tenants = { findById: jest.fn().mockResolvedValue({ name: "Acme Formation" }) } as unknown as TenantsFacade;
  return { useCase: new GeneratePayoutStatementUseCase(repository, renderer, tenants, ledger), renderer, ledger };
}

describe("GeneratePayoutStatementUseCase", () => {
  it("génère le relevé d'un reversement exécuté, avec le compte masqué", async () => {
    const { useCase, renderer } = build(buildPayout());
    const result = await useCase.execute("tenant-1", PAYOUT_ID);
    expect(result.filename).toBe(`${buildPayoutStatementNumber(PAYOUT_ID)}.pdf`);
    expect(renderer.render).toHaveBeenCalledWith(
      expect.objectContaining({ tenantName: "Acme Formation", amount: 120000, accountNumberMasked: "••••6789" }),
    );
  });

  it("traite le reversement d'une autre entreprise comme introuvable", async () => {
    const { useCase, renderer } = build(buildPayout({ tenantId: "autre-tenant" }));
    await expect(useCase.execute("tenant-1", PAYOUT_ID)).rejects.toThrow(NotFoundDomainError);
    expect(renderer.render).not.toHaveBeenCalled();
  });

  it.each([PayoutStatus.REQUESTED, PayoutStatus.VALIDATED, PayoutStatus.APPROVED, PayoutStatus.REJECTED])(
    "refuse un relevé pour un reversement %s",
    async (status) => {
      const { useCase } = build(buildPayout({ status }));
      await expect(useCase.execute("tenant-1", PAYOUT_ID)).rejects.toThrow(PayoutStatementUnavailableError);
    },
  );
});

describe("PdfKitPayoutStatementRendererAdapter", () => {
  it("produit un document PDF", async () => {
    const buffer = await new PdfKitPayoutStatementRendererAdapter().render({
      number: "REL-A1B2C3D4",
      tenantName: "Acme Formation",
      amount: 120000,
      currency: "XOF",
      destinationType: "MOBILE_MONEY",
      accountName: "Awa Kone",
      accountNumberMasked: "••••6789",
      requestedAt: new Date("2026-11-01T00:00:00Z"),
      executedAt: null,
    });
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
