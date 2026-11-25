import type { SubscriptionsFacade } from "@modules/subscriptions/subscriptions.facade";

import type { InitiatePaymentUseCase } from "./initiate-payment.use-case";
import type { ListAvailableMethodsUseCase } from "./list-available-methods.use-case";
import { RenewDueSubscriptionsUseCase } from "./renew-subscriptions.use-case";

const NOW = new Date("2026-11-20T00:00:00Z");

const quote = (id: string, amount = 25000) => ({
  subscriptionId: id,
  tenantId: `tenant-${id}`,
  amount,
  currency: "XOF",
});

function setup(methods: string[] = ["CARD", "MTN_MOMO"]) {
  const facade = {
    listRenewalCandidateIds: jest.fn(),
    beginRenewal: jest.fn(),
    attachRenewalPayment: jest.fn().mockResolvedValue(undefined),
    handleRenewalFailure: jest.fn().mockResolvedValue(undefined),
  };
  const initiate = {
    execute: jest
      .fn()
      .mockResolvedValue({ paymentId: "pay-1", checkout: { checkoutUrl: "https://pay/1", providerReference: "r", isAsync: false } }),
  };
  const list = { execute: jest.fn().mockResolvedValue(methods) };
  const useCase = new RenewDueSubscriptionsUseCase(
    facade as unknown as SubscriptionsFacade,
    initiate as unknown as InitiatePaymentUseCase,
    list as unknown as ListAvailableMethodsUseCase,
  );
  return { facade, initiate, list, useCase };
}

describe("RenewDueSubscriptionsUseCase", () => {
  it("ne fait rien sans candidat", async () => {
    const { facade, list, useCase } = setup();
    facade.listRenewalCandidateIds.mockResolvedValue([]);
    await expect(useCase.execute(NOW)).resolves.toEqual({ candidates: 0, requested: 0, skipped: 0, failed: 0 });
    expect(list.execute).not.toHaveBeenCalled();
    expect(facade.listRenewalCandidateIds).toHaveBeenCalledWith(NOW);
  });

  it("crée un paiement du montant exact avec le moyen mobile préféré et l'attache à l'abonnement", async () => {
    const { facade, initiate, useCase } = setup(["CARD", "MTN_MOMO"]);
    facade.listRenewalCandidateIds.mockResolvedValue(["s1"]);
    facade.beginRenewal.mockResolvedValue(quote("s1", 19900));

    const report = await useCase.execute(NOW);

    expect(report).toEqual({ candidates: 1, requested: 1, skipped: 0, failed: 0 });
    expect(initiate.execute).toHaveBeenCalledWith({
      tenantId: "tenant-s1",
      type: "SUBSCRIPTION",
      method: "MTN_MOMO",
      amount: 19900,
      currency: "XOF",
      objectId: "s1",
      subscriptionId: "s1",
    });
    expect(facade.attachRenewalPayment).toHaveBeenCalledWith("s1", "pay-1", "https://pay/1", "XOF");
  });

  it("transmet null quand le checkout n'a pas d'URL", async () => {
    const { facade, initiate, useCase } = setup();
    initiate.execute.mockResolvedValue({ paymentId: "pay-2", checkout: { providerReference: "r", isAsync: true } });
    facade.listRenewalCandidateIds.mockResolvedValue(["s1"]);
    facade.beginRenewal.mockResolvedValue(quote("s1"));
    await useCase.execute(NOW);
    expect(facade.attachRenewalPayment).toHaveBeenCalledWith("s1", "pay-2", null, "XOF");
  });

  it("compte comme ignoré une échéance déjà réservée (beginRenewal renvoie null)", async () => {
    const { facade, initiate, useCase } = setup();
    facade.listRenewalCandidateIds.mockResolvedValue(["s1"]);
    facade.beginRenewal.mockResolvedValue(null);
    const report = await useCase.execute(NOW);
    expect(report).toEqual({ candidates: 1, requested: 0, skipped: 1, failed: 0 });
    expect(initiate.execute).not.toHaveBeenCalled();
  });

  it("traite comme un échec de renouvellement quand aucun moyen de paiement n'est disponible", async () => {
    const { facade, initiate, useCase } = setup([]);
    facade.listRenewalCandidateIds.mockResolvedValue(["s1"]);
    facade.beginRenewal.mockResolvedValue(quote("s1"));
    const report = await useCase.execute(NOW);
    expect(report).toEqual({ candidates: 1, requested: 0, skipped: 0, failed: 1 });
    expect(initiate.execute).not.toHaveBeenCalled();
    expect(facade.handleRenewalFailure).toHaveBeenCalledWith("s1");
  });

  it("déclenche la gestion d'échec quand la création du paiement échoue, sans interrompre les suivants", async () => {
    const { facade, initiate, useCase } = setup();
    facade.listRenewalCandidateIds.mockResolvedValue(["s1", "s2"]);
    facade.beginRenewal.mockImplementation(async (id: string) => quote(id));
    initiate.execute.mockRejectedValueOnce(new Error("gateway down"));
    const report = await useCase.execute(NOW);
    expect(report).toEqual({ candidates: 2, requested: 1, skipped: 0, failed: 1 });
    expect(facade.handleRenewalFailure).toHaveBeenCalledTimes(1);
    expect(facade.handleRenewalFailure).toHaveBeenCalledWith("s1");
    expect(facade.attachRenewalPayment).toHaveBeenCalledWith("s2", "pay-1", "https://pay/1", "XOF");
  });

  it("compte un échec quand beginRenewal lève, et poursuit", async () => {
    const { facade, useCase } = setup();
    facade.listRenewalCandidateIds.mockResolvedValue(["s1", "s2"]);
    facade.beginRenewal.mockRejectedValueOnce(new Error("db")).mockResolvedValueOnce(quote("s2"));
    const report = await useCase.execute(NOW);
    expect(report).toEqual({ candidates: 2, requested: 1, skipped: 0, failed: 1 });
    expect(facade.handleRenewalFailure).not.toHaveBeenCalled();
  });

  it("utilise la date courante par défaut", async () => {
    const { facade, useCase } = setup();
    facade.listRenewalCandidateIds.mockResolvedValue([]);
    await useCase.execute();
    expect(facade.listRenewalCandidateIds.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });
});
