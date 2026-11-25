import { createHmac, timingSafeEqual } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";

import type {
  Checkout,
  ParsedWebhookEvent,
  PaymentOrder,
  PaymentResult,
  RawWebhookEvent,
  WebhookEventType,
} from "../../domain/gateway.types";
import type { PaymentGateway } from "../../domain/payment-gateway.port";
import type { PaymentMethod } from "../../domain/payment-method";

/**
 * Adaptateur Pixel Innov — agrégateur local mobile money ivoiriens
 * (section 9.2). ATTENTION: la documentation API exacte de Pixel Innov
 * (endpoints, format des webhooks, en-tête de signature, API de transfert)
 * reste "à confirmer auprès du fournisseur avant le développement" selon le
 * cahier des charges (section 9.2, encadré "À confirmer"). Cette classe
 * reproduit la forme générique d'un agrégateur mobile money ouest-africain ;
 * elle doit être revue contre la documentation réelle avant mise en
 * production, en particulier `verifySignature` (algorithme de signature non
 * confirmé) et le mapping des statuts dans `mapStatus`/`mapEventType`.
 *
 * N'implémente pas RefundCapable : l'API de remboursement de Pixel Innov
 * n'est pas confirmée (section 9.2) — un remboursement sur ce fournisseur
 * passe donc par le traitement manuel (ADM-26).
 */
@Injectable()
export class PixelInnovGateway implements PaymentGateway {
  readonly code = "PIXEL_INNOV";
  readonly supportedMethods: readonly PaymentMethod[] = ["ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE"];

  private readonly logger = new Logger(PixelInnovGateway.name);
  private readonly baseUrl = process.env.PIXEL_INNOV_BASE_URL ?? "https://api.pixelinnov.com";

  constructor(
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async initiate(order: PaymentOrder): Promise<Checkout> {
    const response = await fetch(`${this.baseUrl}/v1/payments`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        reference: order.reference,
        amount: order.amount,
        currency: order.currency,
        method: order.method,
        metadata: order.metadata,
      }),
    });

    const body = (await response.json()) as { reference: string; payment_url?: string };
    if (!response.ok) {
      throw new Error(`Échec d'initialisation Pixel Innov pour la référence ${order.reference}.`);
    }

    // Mobile money: toujours asynchrone (validation sur le téléphone, section 9.6).
    return { checkoutUrl: body.payment_url, providerReference: body.reference, isAsync: true };
  }

  async verify(providerReference: string): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/v1/payments/${providerReference}`, {
      headers: this.authHeaders(),
    });

    const body = (await response.json()) as {
      reference: string;
      status: string;
      amount: number;
      currency: string;
      fee?: number;
    };
    if (!response.ok) {
      throw new Error(`Échec de vérification Pixel Innov pour la référence ${providerReference}.`);
    }

    return {
      providerReference: body.reference,
      status: this.mapStatus(body.status),
      amount: body.amount,
      currency: body.currency,
      providerFee: body.fee ?? 0,
    };
  }

  /**
   * Algorithme de signature non confirmé par la documentation Pixel Innov
   * (section 9.2). Implémenté par analogie avec Paystack (HMAC SHA-256 sur
   * le corps brut) — à valider ou remplacer à l'intégration réelle.
   */
  verifySignature(event: RawWebhookEvent): boolean {
    const signature = event.headers["x-pixelinnov-signature"];
    if (!signature) return false;

    const expected = createHmac("sha256", this.apiSecret).update(event.rawBody).digest("hex");
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  parseEvent(event: RawWebhookEvent): ParsedWebhookEvent {
    const payload = JSON.parse(event.rawBody) as { event: string; reference: string };

    return {
      type: this.mapEventType(payload.event),
      providerReference: payload.reference,
      rawPayload: payload,
    };
  }

  private mapStatus(status: string): PaymentResult["status"] {
    if (status === "completed" || status === "success") return "SUCCEEDED";
    if (status === "failed" || status === "cancelled") return "FAILED";
    return "PENDING";
  }

  private mapEventType(event: string): WebhookEventType {
    switch (event) {
      case "payment.success":
        return "PAYMENT_SUCCEEDED";
      case "payment.failed":
        return "PAYMENT_FAILED";
      default:
        this.logger.debug(`Événement Pixel Innov non géré: ${event}`);
        return "UNKNOWN";
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }
}
