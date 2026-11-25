import type { RefundProcessedEvent } from "@modules/payments/payments.events";

import type { LedgerRepositoryPort } from "../domain/ledger.repository.port";

import { RecordRefundToLedgerListener } from "./record-refund-to-ledger.listener";

const event = (over: { type?: string; amount?: number; refunded?: number } = {}): RefundProcessedEvent =>
  ({
    payment: {
      id: "pay-1",
      tenantId: "tenant-1",
      currency: "XOF",
      type: over.type ?? "COURSE_ENROLLMENT",
      amount: over.amount ?? 50_000,
    },
    refundedAmount: over.refunded ?? 50_000,
  }) as unknown as RefundProcessedEvent;

function setup(net: number | null) {
  const ledger = {
    getTenantNetForSale: jest.fn().mockResolvedValue(net),
    record: jest.fn().mockResolvedValue(undefined),
  };
  return { ledger, listener: new RecordRefundToLedgerListener(ledger as unknown as LedgerRepositoryPort) };
}

const sum = (entries: { account: string; direction: string; amount: number }[], direction: string) =>
  entries.filter((e) => e.direction === direction).reduce((total, e) => total + e.amount, 0);

describe("RecordRefundToLedgerListener (RG-25)", () => {
  it("ignore les paiements qui ne sont pas des ventes de formation", async () => {
    const { ledger, listener } = setup(42_000);
    await listener.handle(event({ type: "SUBSCRIPTION" }));
    expect(ledger.getTenantNetForSale).not.toHaveBeenCalled();
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand la vente d'origine est introuvable au grand livre", async () => {
    const { ledger, listener } = setup(null);
    await listener.handle(event());
    expect(ledger.getTenantNetForSale).toHaveBeenCalledWith("pay-1");
    expect(ledger.record).not.toHaveBeenCalled();
  });

  it("remboursement intégral : reprend exactement le net de l'entreprise", async () => {
    const { ledger, listener } = setup(42_000);
    await listener.handle(event({ refunded: 50_000 }));
    const input = ledger.record.mock.calls[0]?.[0];
    expect(input).toMatchObject({ tenantId: "tenant-1", currency: "XOF", sourceId: "refund-pay-1" });
    expect(input.availableAt).toBeInstanceOf(Date);
    expect(input.entries).toEqual([
      { account: "PROVIDER", direction: "CREDIT", amount: 50_000, sourceType: "REFUND" },
      { account: "PLATFORM", direction: "DEBIT", amount: 50_000, sourceType: "REFUND" },
      { account: "TENANT", direction: "DEBIT", amount: 42_000, sourceType: "REFUND" },
      { account: "PLATFORM", direction: "CREDIT", amount: 42_000, sourceType: "REFUND" },
    ]);
  });

  it("remboursement partiel : le net repris est proportionnel au montant remboursé", async () => {
    const { ledger, listener } = setup(42_000);
    await listener.handle(event({ refunded: 20_000 }));
    const entries = ledger.record.mock.calls[0]?.[0].entries;
    // 42 000 * 20 000 / 50 000 = 16 800
    expect(entries[0]).toMatchObject({ account: "PROVIDER", direction: "CREDIT", amount: 20_000 });
    expect(entries[2]).toMatchObject({ account: "TENANT", direction: "DEBIT", amount: 16_800 });
    expect(entries[3]).toMatchObject({ account: "PLATFORM", direction: "CREDIT", amount: 16_800 });
  });

  it("arrondit le net repris à l'unité et reste équilibré (débits = crédits)", async () => {
    const { ledger, listener } = setup(1_000);
    await listener.handle(event({ amount: 3, refunded: 1 }));
    const entries = ledger.record.mock.calls[0]?.[0].entries;
    expect(entries[2].amount).toBe(333);
    expect(sum(entries, "DEBIT")).toBe(sum(entries, "CREDIT"));
  });
});
