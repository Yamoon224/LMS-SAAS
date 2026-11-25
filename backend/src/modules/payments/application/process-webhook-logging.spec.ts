import type { EventEmitter2 } from "@nestjs/event-emitter";
import { NotFoundDomainError } from "@shared/errors";

import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import type { WebhookEventLogPort } from "../domain/webhook-event-log.port";

import { InvalidWebhookSignatureError, ProcessWebhookUseCase } from "./process-webhook.use-case";

const RAW_EVENT = { headers: {}, rawBody: "{}" };

function build(options: {
  gateway?: Partial<PaymentGateway> | null;
  payment?: { id: string; isPending: () => boolean } | null;
  record?: jest.Mock;
}) {
  const gateway =
    options.gateway === null
      ? null
      : ({
          code: "PAYSTACK",
          verifySignature: jest.fn().mockReturnValue(true),
          parseEvent: jest.fn().mockReturnValue({ providerReference: "ref-1", rawPayload: {} }),
          verify: jest.fn().mockResolvedValue({ status: "PENDING" }),
          ...options.gateway,
        } as unknown as PaymentGateway);
  const registry = { findByCode: jest.fn().mockResolvedValue(gateway) } as unknown as PaymentGatewayRegistryPort;
  const payments = {
    findByProviderReference: jest.fn().mockResolvedValue(options.payment ?? null),
    storeRawWebhookPayload: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
  } as unknown as PaymentRepositoryPort;
  const log: WebhookEventLogPort = {
    record: options.record ?? jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    listUnresolvedFailures: jest.fn(),
    markResolved: jest.fn(),
  };
  const useCase = new ProcessWebhookUseCase(registry, payments, { emit: jest.fn() } as unknown as EventEmitter2, log);
  return { useCase, log };
}

describe("ProcessWebhookUseCase — journal des issues (ADM-35)", () => {
  it("journalise PROCESSED quand le paiement en attente est traité", async () => {
    const { useCase, log } = build({ payment: { id: "p1", isPending: () => true } });
    await useCase.execute("PAYSTACK", RAW_EVENT);
    expect(log.record).toHaveBeenCalledWith("PAYSTACK", "PROCESSED", "ref-1");
  });

  it("journalise DUPLICATE pour un paiement déjà traité", async () => {
    const { useCase, log } = build({ payment: { id: "p1", isPending: () => false } });
    await useCase.execute("PAYSTACK", RAW_EVENT);
    expect(log.record).toHaveBeenCalledWith("PAYSTACK", "DUPLICATE", "ref-1");
  });

  it("journalise UNKNOWN_REFERENCE sans erreur pour une référence inconnue", async () => {
    const { useCase, log } = build({ payment: null });
    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).resolves.toBeUndefined();
    expect(log.record).toHaveBeenCalledWith("PAYSTACK", "UNKNOWN_REFERENCE", "ref-1");
  });

  it("journalise INVALID_SIGNATURE puis relance l'erreur", async () => {
    const { useCase, log } = build({ gateway: { verifySignature: jest.fn().mockReturnValue(false) } });
    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).rejects.toThrow(InvalidWebhookSignatureError);
    expect(log.record).toHaveBeenCalledWith("PAYSTACK", "INVALID_SIGNATURE", undefined);
  });

  it("journalise ERROR puis relance une erreur inattendue du fournisseur", async () => {
    const { useCase, log } = build({
      payment: { id: "p1", isPending: () => true },
      gateway: { verify: jest.fn().mockRejectedValue(new Error("fournisseur injoignable")) },
    });
    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).rejects.toThrow("fournisseur injoignable");
    expect(log.record).toHaveBeenCalledWith("PAYSTACK", "ERROR", "ref-1");
  });

  it("ne journalise pas un fournisseur inconnu : le code vient de l'URL et ne doit pas permettre de remplir le journal", async () => {
    const { useCase, log } = build({ gateway: null });
    await expect(useCase.execute("N-IMPORTE-QUOI", RAW_EVENT)).rejects.toThrow(NotFoundDomainError);
    expect(log.record).not.toHaveBeenCalled();
  });

  it("ne fait pas échouer le webhook si le journal est en panne", async () => {
    const { useCase } = build({
      payment: { id: "p1", isPending: () => true },
      record: jest.fn().mockRejectedValue(new Error("base indisponible")),
    });
    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).resolves.toBeUndefined();
  });

  it("relance l'erreur d'origine, pas celle du journal, quand les deux échouent", async () => {
    const { useCase } = build({
      gateway: { verifySignature: jest.fn().mockReturnValue(false) },
      record: jest.fn().mockRejectedValue(new Error("base indisponible")),
    });
    await expect(useCase.execute("PAYSTACK", RAW_EVENT)).rejects.toThrow(InvalidWebhookSignatureError);
  });
});
