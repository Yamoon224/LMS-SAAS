import {
  buildOfflineCommissionLedgerEntries,
  buildPayoutLedgerEntries,
  buildRefundLedgerEntries,
  prorateTenantNet,
} from "./refund-ledger-entries";
import { assertBalanced } from "./sale-ledger-entries";

describe("buildRefundLedgerEntries", () => {
  it("balances for a full refund (RG-25)", () => {
    const entries = buildRefundLedgerEntries({ refundAmount: 50000, tenantNetToReverse: 43750 });
    expect(() => assertBalanced(entries)).not.toThrow();
  });

  it("balances for a partial refund with a different tenant share", () => {
    const entries = buildRefundLedgerEntries({ refundAmount: 20000, tenantNetToReverse: 17500 });
    expect(() => assertBalanced(entries)).not.toThrow();
  });

  it("balances even when tenantNetToReverse is zero (fully absorbed by commission)", () => {
    const entries = buildRefundLedgerEntries({ refundAmount: 1000, tenantNetToReverse: 0 });
    expect(() => assertBalanced(entries)).not.toThrow();
  });
});

describe("prorateTenantNet (RG-25, remboursement partiel)", () => {
  it("reprend exactement le net pour un remboursement intégral", () => {
    expect(prorateTenantNet(43750, 50000, 50000)).toBe(43750);
  });

  it("reprend une part proportionnelle pour un remboursement partiel", () => {
    expect(prorateTenantNet(43750, 25000, 50000)).toBe(21875);
    expect(prorateTenantNet(43750, 10000, 50000)).toBe(8750);
  });

  it("arrondit à l'unité", () => {
    expect(prorateTenantNet(1000, 1, 3)).toBe(333);
  });

  it("ne dépasse jamais le net, même si le montant remboursé dépasse le paiement", () => {
    expect(prorateTenantNet(43750, 60000, 50000)).toBe(43750);
  });

  it("reste équilibré avec un montant partiel", () => {
    const entries = buildRefundLedgerEntries({ refundAmount: 10000, tenantNetToReverse: prorateTenantNet(43750, 10000, 50000) });
    expect(() => assertBalanced(entries)).not.toThrow();
  });
});

describe("buildOfflineCommissionLedgerEntries", () => {
  it("balances the commission due on an offline sale (RG-24)", () => {
    const entries = buildOfflineCommissionLedgerEntries({ commissionAmount: 2500 });
    expect(() => assertBalanced(entries)).not.toThrow();
  });
});

describe("buildPayoutLedgerEntries", () => {
  it("balances a payout execution (ADM-24, section 8.1)", () => {
    const entries = buildPayoutLedgerEntries({ amount: 150000 });
    expect(() => assertBalanced(entries)).not.toThrow();
  });
});
