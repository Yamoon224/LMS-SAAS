import { buildRefundLedgerEntries } from "./refund-ledger-entries";
import { assertBalanced, buildSaleLedgerEntries } from "./sale-ledger-entries";
import type { LedgerEntryDraft } from "./sale-ledger-entries";
import { summarizeSalesBreakdown } from "./sales-breakdown";
import type { BreakdownLedgerRow } from "./sales-breakdown";

const sum = (entries: LedgerEntryDraft[], account: string, direction: string, sourceType?: string) =>
  entries
    .filter((e) => e.account === account && e.direction === direction && (!sourceType || e.sourceType === sourceType))
    .reduce((total, e) => total + e.amount, 0);

describe("écritures de ventilation commission / frais (étape 30)", () => {
  const input = { grossAmount: 50000, commissionAmount: 5000, providerFee: 1250 };

  it("reste équilibré et ne change pas le net crédité (frais à la charge de l'entreprise)", () => {
    const entries = buildSaleLedgerEntries({ ...input, feeChargedToTenant: true });
    expect(() => assertBalanced(entries)).not.toThrow();
    expect(sum(entries, "TENANT", "CREDIT")).toBe(43750);
    expect(sum(entries, "PLATFORM", "CREDIT", "COMMISSION")).toBe(5000);
    expect(sum(entries, "PROVIDER", "CREDIT", "FEE")).toBe(1250);
  });

  it("reste équilibré et ne change pas le net quand la plateforme supporte les frais", () => {
    const entries = buildSaleLedgerEntries({ ...input, feeChargedToTenant: false });
    expect(() => assertBalanced(entries)).not.toThrow();
    expect(sum(entries, "TENANT", "CREDIT")).toBe(45000);
  });

  it("n'écrit rien pour une commission ou un frais nuls et reste équilibré", () => {
    const entries = buildSaleLedgerEntries({ grossAmount: 20000, commissionAmount: 0, providerFee: 0, feeChargedToTenant: true });
    expect(entries.filter((e) => e.sourceType === "COMMISSION" || e.sourceType === "FEE")).toHaveLength(0);
    expect(() => assertBalanced(entries)).not.toThrow();
  });

  it("l'ensemble vente + remboursement reste équilibré et le solde TENANT retombe à zéro", () => {
    const sale = buildSaleLedgerEntries({ ...input, feeChargedToTenant: true });
    const refund = buildRefundLedgerEntries({ refundAmount: 50000, tenantNetToReverse: 43750 });
    expect(() => assertBalanced([...sale, ...refund])).not.toThrow();
    const all = [...sale, ...refund];
    expect(sum(all, "TENANT", "CREDIT") - sum(all, "TENANT", "DEBIT")).toBe(0);
  });

  it("refuse un frais négatif", () => {
    expect(() => buildSaleLedgerEntries({ ...input, providerFee: -1, feeChargedToTenant: true })).toThrow();
  });
});

function rowsOf(saleId: string, entries: LedgerEntryDraft[]): BreakdownLedgerRow[] {
  return entries.map((entry) => ({ sourceId: saleId, ...entry }));
}

describe("summarizeSalesBreakdown — relevé brut / commission / frais / net", () => {
  it("ventile une vente récente : brut = commission + frais + net", () => {
    const result = summarizeSalesBreakdown(
      rowsOf("p1", buildSaleLedgerEntries({ grossAmount: 50000, commissionAmount: 5000, providerFee: 1250, feeChargedToTenant: true })),
    );
    expect(result).toMatchObject({ salesCount: 1, gross: 50000, commission: 5000, feeChargedToTenant: 1250, unallocated: 0, net: 43750 });
  });

  it("frais supportés par la plateforme : aucun frais n'est imputé à l'entreprise", () => {
    const result = summarizeSalesBreakdown(
      rowsOf("p1", buildSaleLedgerEntries({ grossAmount: 50000, commissionAmount: 5000, providerFee: 1250, feeChargedToTenant: false })),
    );
    expect(result).toMatchObject({ gross: 50000, commission: 5000, feeChargedToTenant: 0, net: 45000 });
  });

  it("compatibilité : une vente enregistrée avant l'étape 30 (sans écritures de ventilation) va en « non ventilé »", () => {
    const legacy: BreakdownLedgerRow[] = [
      { sourceId: "old", account: "PROVIDER", direction: "DEBIT", sourceType: "SALE", amount: 50000 },
      { sourceId: "old", account: "PLATFORM", direction: "CREDIT", sourceType: "SALE", amount: 50000 },
      { sourceId: "old", account: "PLATFORM", direction: "DEBIT", sourceType: "SALE", amount: 43750 },
      { sourceId: "old", account: "TENANT", direction: "CREDIT", sourceType: "SALE", amount: 43750 },
    ];
    const result = summarizeSalesBreakdown(legacy);
    expect(result).toMatchObject({ gross: 50000, commission: 0, feeChargedToTenant: 0, unallocated: 6250, net: 43750 });
  });

  it("additionne plusieurs ventes et garde l'invariant brut = commission + frais + non ventilé + net", () => {
    const rows = [
      ...rowsOf("a", buildSaleLedgerEntries({ grossAmount: 10000, commissionAmount: 1000, providerFee: 250, feeChargedToTenant: true })),
      ...rowsOf("b", buildSaleLedgerEntries({ grossAmount: 30000, commissionAmount: 3000, providerFee: 750, feeChargedToTenant: false })),
    ];
    const r = summarizeSalesBreakdown(rows);
    expect(r.salesCount).toBe(2);
    expect(r.gross).toBe(r.commission + r.feeChargedToTenant + r.unallocated + r.net);
  });

  it("compte les remboursements et commissions hors plateforme comme reprises, sans toucher au brut", () => {
    const rows: BreakdownLedgerRow[] = [
      ...rowsOf("a", buildSaleLedgerEntries({ grossAmount: 10000, commissionAmount: 1000, providerFee: 0, feeChargedToTenant: true })),
      { sourceId: "refund-a", account: "TENANT", direction: "DEBIT", sourceType: "REFUND", amount: 9000 },
      { sourceId: "enr", account: "TENANT", direction: "DEBIT", sourceType: "OFFLINE_COMMISSION", amount: 500 },
    ];
    expect(summarizeSalesBreakdown(rows)).toMatchObject({ gross: 10000, net: 9000, deductions: 9500, salesCount: 1 });
  });

  it("une période sans vente donne un relevé vide", () => {
    expect(summarizeSalesBreakdown([])).toEqual({ salesCount: 0, gross: 0, commission: 0, feeChargedToTenant: 0, unallocated: 0, net: 0, deductions: 0 });
  });
});
