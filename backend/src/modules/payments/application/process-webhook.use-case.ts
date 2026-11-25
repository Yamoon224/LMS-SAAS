import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import type { RawWebhookEvent } from "../domain/gateway.types";
import { PAYMENT_GATEWAY_REGISTRY } from "../domain/payment-gateway-registry.port";
import type { PaymentGatewayRegistryPort } from "../domain/payment-gateway-registry.port";
import type { PaymentGateway } from "../domain/payment-gateway.port";
import type { Payment } from "../domain/payment.entity";
import { PAYMENT_REPOSITORY } from "../domain/payment.repository.port";
import type { PaymentRepositoryPort } from "../domain/payment.repository.port";
import { WEBHOOK_EVENT_LOG } from "../domain/webhook-event-log.port";
import type { WebhookEventLogPort, WebhookOutcome } from "../domain/webhook-event-log.port";
import { PaymentFailedEvent, PaymentSucceededEvent } from "../payments.events";

export class InvalidWebhookSignatureError extends DomainError {
  readonly code = "SIGNATURE_WEBHOOK_INVALIDE";
}

/**
 * BE-05/RG-06: traite un webhook entrant.
 * 1. Vérifie la signature propre au fournisseur (HMAC) avant toute lecture du contenu.
 * 2. Résout le paiement par référence (idempotence : un événement déjà traité est ignoré sans erreur).
 * 3. Re-vérifie la transaction auprès de l'API du fournisseur (ne fait jamais
 *    confiance au seul contenu du webhook pour changer un état financier).
 * 4. Applique la transition et stocke l'événement brut reçu (BE-05).
 *
 * ADM-35 : l'issue de chaque webhook d'un fournisseur connu est journalisée (fournisseur, issue, date), y compris en
 * cas d'erreur, pour mesurer le taux d'erreur. Un fournisseur inconnu n'est pas journalisé : le code vient de l'URL et
 * n'importe qui pourrait remplir le journal. Une panne du journal ne doit jamais faire échouer le webhook.
 */
@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY_REGISTRY) private readonly gatewayRegistry: PaymentGatewayRegistryPort,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
    @Inject(WEBHOOK_EVENT_LOG) private readonly eventLog: WebhookEventLogPort,
  ) {}

  async execute(providerCode: string, rawEvent: RawWebhookEvent): Promise<void> {
    const gateway = await this.gatewayRegistry.findByCode(providerCode);
    if (!gateway) {
      throw new NotFoundDomainError(`Fournisseur de paiement inconnu: ${providerCode}`);
    }

    // Référence extraite du contenu APRÈS validation de la signature : conservée au journal pour permettre un rejeu.
    const context: { providerReference?: string } = {};
    try {
      const outcome = await this.handle(gateway, rawEvent, context);
      await this.record(gateway.code, outcome, context.providerReference);
    } catch (error) {
      await this.record(
        gateway.code,
        error instanceof InvalidWebhookSignatureError ? "INVALID_SIGNATURE" : "ERROR",
        context.providerReference,
      );
      throw error;
    }
  }

  private async handle(
    gateway: PaymentGateway,
    rawEvent: RawWebhookEvent,
    context: { providerReference?: string } = {},
  ): Promise<WebhookOutcome> {
    if (!gateway.verifySignature(rawEvent)) {
      throw new InvalidWebhookSignatureError(
        `Signature de webhook invalide pour le fournisseur ${gateway.code}.`,
      );
    }

    const parsed = gateway.parseEvent(rawEvent);
    context.providerReference = parsed.providerReference;

    const payment = await this.paymentRepository.findByProviderReference(
      gateway.code,
      parsed.providerReference,
    );
    if (!payment) {
      this.logger.warn(`Webhook reçu pour une référence inconnue: ${parsed.providerReference}`);
      return "UNKNOWN_REFERENCE";
    }

    await this.paymentRepository.storeRawWebhookPayload(payment.id, parsed.rawPayload);

    if (!payment.isPending()) {
      // Idempotence (BE-05): un événement déjà traité (réémission du fournisseur) est ignoré.
      return "DUPLICATE";
    }

    await this.settlePending(gateway, payment);
    return "PROCESSED";
  }

  /**
   * RG-06: re-vérification serveur de la transaction avant tout changement d'état, jamais confiance seule au contenu
   * (potentiellement falsifiable) d'un webhook. Point UNIQUE de transition d'un paiement en attente : le webhook, le
   * sondage des paiements PENDING et le rejeu d'un webhook passent tous par ici. Le paiement doit être PENDING (les
   * appelants vérifient l'idempotence) ; un statut "PENDING" confirmé par le fournisseur (mobile money en attente de
   * validation sur le téléphone) ne déclenche aucune transition. Renvoie le statut confirmé par le fournisseur.
   */
  async settlePending(gateway: PaymentGateway, payment: Payment): Promise<"PENDING" | "SUCCEEDED" | "FAILED"> {
    const verifiedResult = await gateway.verify(payment.providerReference);

    if (verifiedResult.status === "SUCCEEDED") {
      payment.markSucceeded(verifiedResult.providerFee);
      await this.paymentRepository.save(payment);
      this.eventEmitter.emit("payment.succeeded", new PaymentSucceededEvent(payment));
    } else if (verifiedResult.status === "FAILED") {
      payment.markFailed();
      await this.paymentRepository.save(payment);
      this.eventEmitter.emit("payment.failed", new PaymentFailedEvent(payment));
    }
    return verifiedResult.status;
  }

  /** Expire un paiement resté en attente trop longtemps (motif « expiré ») : même événement `payment.failed`. */
  async expirePending(payment: Payment, reason: string): Promise<void> {
    payment.markFailed(reason);
    await this.paymentRepository.save(payment);
    this.eventEmitter.emit("payment.failed", new PaymentFailedEvent(payment));
  }

  private async record(providerCode: string, outcome: WebhookOutcome, providerReference?: string): Promise<void> {
    try {
      await this.eventLog.record(providerCode, outcome, providerReference);
    } catch (error) {
      this.logger.warn(`Journalisation du webhook impossible (${providerCode}, ${outcome}) : ${String(error)}`);
    }
  }
}
