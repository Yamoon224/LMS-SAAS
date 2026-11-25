import type { EventEmitter2 } from "@nestjs/event-emitter";

import { ProrataPaymentRequestedEvent } from "../payments.events";

import type { InitiatePaymentUseCase } from "./initiate-payment.use-case";
import type { ListAvailableMethodsUseCase } from "./list-available-methods.use-case";
import { RequestProrataPaymentListener } from "./request-prorata-payment.listener";

type PlanChanged = Parameters<RequestProrataPaymentListener["handle"]>[0];
const event = (overrides: Partial<PlanChanged> = {}): PlanChanged =>
  ({
    subscriptionId: "sub-1",
    tenantId: "tenant-1",
    newPlanPriceId: "price-2",
    immediate: true,
    prorataAmountDue: 7500,
    currency: "XOF",
    ...overrides,
  }) as PlanChanged;

function setup(methods: string[] = ["CARD"]) {
  const initiate = {
    execute: jest
      .fn()
      .mockResolvedValue({ paymentId: "p1", checkout: { checkoutUrl: "https://pay/p1", providerReference: "r", isAsync: false } }),
  };
  const list = { execute: jest.fn().mockResolvedValue(methods) };
  const emitter = { emit: jest.fn() };
  const listener = new RequestProrataPaymentListener(
    initiate as unknown as InitiatePaymentUseCase,
    list as unknown as ListAvailableMethodsUseCase,
    emitter as unknown as EventEmitter2,
  );
  return { initiate, list, emitter, listener };
}

describe("RequestProrataPaymentListener", () => {
  it.each([
    ["changement non immédiat", { immediate: false }],
    ["prorata nul", { prorataAmountDue: 0 }],
    ["prorata négatif", { prorataAmountDue: -100 }],
    ["devise absente", { currency: null }],
  ])("ignore le %s", async (_label, overrides) => {
    const { initiate, list, emitter, listener } = setup();
    await listener.handle(event(overrides as Partial<PlanChanged>));
    expect(list.execute).not.toHaveBeenCalled();
    expect(initiate.execute).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("crée un paiement du montant exact du prorata et publie payment.prorata-requested", async () => {
    const { initiate, emitter, listener } = setup(["CARD", "WAVE"]);
    await listener.handle(event());
    expect(initiate.execute).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      type: "SUBSCRIPTION",
      method: "WAVE",
      amount: 7500,
      currency: "XOF",
      objectId: "sub-1",
      subscriptionId: "sub-1",
    });
    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const [name, payload] = emitter.emit.mock.calls[0] as [string, ProrataPaymentRequestedEvent];
    expect(name).toBe("payment.prorata-requested");
    expect(payload).toBeInstanceOf(ProrataPaymentRequestedEvent);
    expect(payload).toMatchObject({
      tenantId: "tenant-1",
      subscriptionId: "sub-1",
      amount: 7500,
      currency: "XOF",
      checkoutUrl: "https://pay/p1",
    });
  });

  it("publie un checkoutUrl null quand le checkout n'en a pas", async () => {
    const { initiate, emitter, listener } = setup();
    initiate.execute.mockResolvedValue({ paymentId: "p1", checkout: { providerReference: "r", isAsync: true } });
    await listener.handle(event());
    expect((emitter.emit.mock.calls[0]?.[1] as ProrataPaymentRequestedEvent).checkoutUrl).toBeNull();
  });

  it("n'émet rien et ne lève pas quand aucun moyen n'est disponible", async () => {
    const { initiate, emitter, listener } = setup([]);
    await expect(listener.handle(event())).resolves.toBeUndefined();
    expect(initiate.execute).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it("avale l'erreur du paiement sans émettre d'événement", async () => {
    const { initiate, emitter, listener } = setup();
    initiate.execute.mockRejectedValue(new Error("boom"));
    await expect(listener.handle(event())).resolves.toBeUndefined();
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
