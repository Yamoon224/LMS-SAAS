import {
  assertBalanced,
  buildSaleLedgerEntries,
  InvalidSaleAmountError,
} from "./sale-ledger-entries";

describe("buildSaleLedgerEntries", () => {
  it("balances debits and credits for the cahier des charges example (section 9.3)", () => {
    // 50 000 FCFA, frais 2,5% (1 250) à la charge de l'entreprise, commission 10% (5 000) → net 43 750.
    const entries = buildSaleLedgerEntries({
      grossAmount: 50000,
      commissionAmount: 5000,
      providerFee: 1250,
      feeChargedToTenant: true,
    });

    expect(() => assertBalanced(entries)).not.toThrow();

    const tenantCredit = entries.find((e) => e.account === "TENANT" && e.direction === "CREDIT");
    expect(tenantCredit?.amount).toBe(43750);
  });

  it("balances when the platform bears the provider fee instead of the tenant", () => {
    const entries = buildSaleLedgerEntries({
      grossAmount: 50000,
      commissionAmount: 5000,
      providerFee: 1250,
      feeChargedToTenant: false,
    });

    expect(() => assertBalanced(entries)).not.toThrow();

    const tenantCredit = entries.find((e) => e.account === "TENANT" && e.direction === "CREDIT");
    // Fee not deducted from the tenant here: net = gross - commission only.
    expect(tenantCredit?.amount).toBe(45000);
  });

  it("balances for a free commission (0%)", () => {
    const entries = buildSaleLedgerEntries({
      grossAmount: 20000,
      commissionAmount: 0,
      providerFee: 0,
      feeChargedToTenant: false,
    });

    expect(() => assertBalanced(entries)).not.toThrow();
  });
});

describe("buildSaleLedgerEntries - invalid inputs", () => {
  it.each([
    [0, "zero gross amount"],
    [-1000, "negative gross amount"],
  ])("rejects an invalid gross amount: %s (%s)", (grossAmount) => {
    expect(() =>
      buildSaleLedgerEntries({ grossAmount, commissionAmount: 0, providerFee: 0, feeChargedToTenant: false }),
    ).toThrow(InvalidSaleAmountError);
  });

  it("rejects a commission greater than the gross amount", () => {
    expect(() =>
      buildSaleLedgerEntries({
        grossAmount: 1000,
        commissionAmount: 1500,
        providerFee: 0,
        feeChargedToTenant: false,
      }),
    ).toThrow(InvalidSaleAmountError);
  });

  it("rejects when commission plus fee exceed the gross amount", () => {
    expect(() =>
      buildSaleLedgerEntries({
        grossAmount: 1000,
        commissionAmount: 900,
        providerFee: 200,
        feeChargedToTenant: true,
      }),
    ).toThrow(InvalidSaleAmountError);
  });
});

describe("assertBalanced", () => {
  it("rejects a manually unbalanced set of entries", () => {
    expect(() =>
      assertBalanced([
        { account: "PLATFORM", direction: "CREDIT", amount: 100, sourceType: "SALE" },
        { account: "TENANT", direction: "DEBIT", amount: 99, sourceType: "SALE" },
      ]),
    ).toThrow(InvalidSaleAmountError);
  });
});
