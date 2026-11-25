import { CreditWallet, type CreditWalletProps } from "./credit-wallet.entity";
import { InsufficientCreditsError } from "./insufficient-credits.error";

function buildWallet(overrides: Partial<CreditWalletProps> = {}): CreditWallet {
  const props: CreditWalletProps = {
    id: "wallet-1",
    tenantId: "tenant-1",
    balance: 100,
    ...overrides,
  };
  return CreditWallet.fromPersistence(props);
}

describe("CreditWallet", () => {
  it("expose ses propriétés et un snapshot détaché", () => {
    const wallet = buildWallet({ balance: 7 });
    expect(wallet.id).toBe("wallet-1");
    expect(wallet.tenantId).toBe("tenant-1");
    expect(wallet.balance).toBe(7);
    const snapshot = wallet.toSnapshot() as { balance: number };
    snapshot.balance = 999;
    expect(wallet.balance).toBe(7);
  });

  describe("hasSufficientCredits", () => {
    it("retourne true si le solde couvre le montant", () => {
      const wallet = buildWallet({ balance: 100 });
      expect(wallet.hasSufficientCredits(100)).toBe(true);
    });

    it("retourne false si le solde est insuffisant", () => {
      const wallet = buildWallet({ balance: 50 });
      expect(wallet.hasSufficientCredits(51)).toBe(false);
    });
  });

  describe("credit", () => {
    it("augmente le solde du montant donné", () => {
      const wallet = buildWallet({ balance: 100 });
      wallet.credit(50);
      expect(wallet.balance).toBe(150);
    });
  });

  describe("debit", () => {
    it("diminue le solde quand suffisant", () => {
      const wallet = buildWallet({ balance: 100 });
      wallet.debit(30);
      expect(wallet.balance).toBe(70);
    });

    it("permet de débiter exactement le solde disponible", () => {
      const wallet = buildWallet({ balance: 100 });
      wallet.debit(100);
      expect(wallet.balance).toBe(0);
    });

    it("rejette un débit qui ferait passer le solde sous zéro", () => {
      const wallet = buildWallet({ balance: 50 });
      expect(() => wallet.debit(51)).toThrow(InsufficientCreditsError);
      expect(wallet.balance).toBe(50);
    });
  });
});
