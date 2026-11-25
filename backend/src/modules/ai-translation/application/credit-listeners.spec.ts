import type { PlansFacade } from "@modules/plans/plans.facade";

import { CreditLedgerType } from "../domain/credit-ledger-type";
import { CreditWallet } from "../domain/credit-wallet.entity";
import type { CreditWalletRepositoryPort } from "../domain/credit-wallet.repository.port";

import { CreditWalletOnPaymentSucceededListener } from "./credit-wallet-on-payment-succeeded.listener";
import { GrantPlanCreditsOnSubscriptionActivatedListener } from "./grant-plan-credits-on-subscription-activated.listener";

function buildWallets(existing: CreditWallet | null) {
  const created = CreditWallet.fromPersistence({ id: "w-new", tenantId: "t1", balance: 0 });
  return {
    created,
    wallets: {
      findByTenantId: jest.fn().mockResolvedValue(existing),
      createForTenant: jest.fn().mockResolvedValue(created),
      save: jest.fn().mockResolvedValue(undefined),
      recordLedgerEntry: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreditWalletRepositoryPort>,
  };
}

describe("CreditWalletOnPaymentSucceededListener", () => {
  const paymentEvent = (overrides: Record<string, unknown> = {}) =>
    ({ payment: { id: "p1", tenantId: "t1", type: "CREDIT_PURCHASE", creditPackId: "pack-1", ...overrides } }) as never;

  function setup(existing: CreditWallet | null, pack: unknown) {
    const { wallets, created } = buildWallets(existing);
    const plans = { findCreditPack: jest.fn().mockResolvedValue(pack) } as unknown as jest.Mocked<PlansFacade>;
    return { listener: new CreditWalletOnPaymentSucceededListener(wallets, plans), wallets, plans, created };
  }

  it.each([
    ["un paiement d'un autre type", { type: "SUBSCRIPTION" }],
    ["un paiement sans pack", { creditPackId: null }],
  ])("ignore %s", async (_l, overrides) => {
    const { listener, plans, wallets } = setup(null, null);
    await listener.handle(paymentEvent(overrides));
    expect(plans.findCreditPack).not.toHaveBeenCalled();
    expect(wallets.save).not.toHaveBeenCalled();
  });

  it("ne crédite rien si le pack est introuvable", async () => {
    const { listener, wallets } = setup(null, null);
    await listener.handle(paymentEvent());
    expect(wallets.findByTenantId).not.toHaveBeenCalled();
    expect(wallets.save).not.toHaveBeenCalled();
  });

  it("crédite le portefeuille existant et trace l'achat dans le ledger", async () => {
    const wallet = CreditWallet.fromPersistence({ id: "w1", tenantId: "t1", balance: 10 });
    const { listener, wallets } = setup(wallet, { id: "pack-1", name: "Pack S", creditsAmount: 100 });
    await listener.handle(paymentEvent());
    expect(wallet.balance).toBe(110);
    expect(wallets.createForTenant).not.toHaveBeenCalled();
    expect(wallets.save).toHaveBeenCalledWith(wallet);
    expect(wallets.recordLedgerEntry).toHaveBeenCalledWith({
      walletId: "w1",
      type: CreditLedgerType.PURCHASE,
      amount: 100,
      creditPackId: "pack-1",
      note: 'Achat du pack "Pack S"',
    });
  });

  it("crée le portefeuille au premier achat", async () => {
    const { listener, wallets, created } = setup(null, { id: "pack-1", name: "Pack S", creditsAmount: 100 });
    await listener.handle(paymentEvent());
    expect(wallets.createForTenant).toHaveBeenCalledWith("t1");
    expect(created.balance).toBe(100);
    expect(wallets.recordLedgerEntry).toHaveBeenCalledWith(expect.objectContaining({ walletId: "w-new", amount: 100 }));
  });
});

describe("GrantPlanCreditsOnSubscriptionActivatedListener", () => {
  function setup(existing: CreditWallet | null, features: Record<string, unknown>) {
    const { wallets, created } = buildWallets(existing);
    const plans = { getFeatures: jest.fn().mockResolvedValue(features) } as unknown as jest.Mocked<PlansFacade>;
    return { listener: new GrantPlanCreditsOnSubscriptionActivatedListener(wallets, plans), wallets, created };
  }
  const event = { tenantId: "t1" } as never;

  it.each([
    ["aucun crédit inclus", {}],
    ["un volume nul", { aiTranslationCreditsIncluded: 0 }],
  ])("n'accorde rien pour %s", async (_l, features) => {
    const { listener, wallets } = setup(null, features);
    await listener.handle(event);
    expect(wallets.findByTenantId).not.toHaveBeenCalled();
    expect(wallets.save).not.toHaveBeenCalled();
  });

  it("accorde les crédits du plan au portefeuille existant", async () => {
    const wallet = CreditWallet.fromPersistence({ id: "w1", tenantId: "t1", balance: 3 });
    const { listener, wallets } = setup(wallet, { aiTranslationCreditsIncluded: 50 });
    await listener.handle(event);
    expect(wallet.balance).toBe(53);
    expect(wallets.save).toHaveBeenCalledWith(wallet);
    expect(wallets.recordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ walletId: "w1", type: CreditLedgerType.PLAN_GRANT, amount: 50 }),
    );
  });

  it("crée le portefeuille s'il n'existe pas encore", async () => {
    const { listener, wallets, created } = setup(null, { aiTranslationCreditsIncluded: 50 });
    await listener.handle(event);
    expect(wallets.createForTenant).toHaveBeenCalledWith("t1");
    expect(created.balance).toBe(50);
  });
});
