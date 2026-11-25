import { createHmac, timingSafeEqual } from "node:crypto";

import { Injectable, Logger } from "@nestjs/common";

import type {
  Checkout,
  ParsedWebhookEvent,
  PaymentOrder,
  PaymentResult,
  RawWebhookEvent,
  RefundRequest,
  RefundResult,
  WebhookEventType,
} from "../../domain/gateway.types";
import type { RefundCapableGateway } from "../../domain/payment-gateway.port";
import type { PaymentMethod } from "../../domain/payment-method";

interface PaystackChargeResponse {
  status: boolean;
  data: {
    reference: string;
    authorization_url?: string;
    status: string;
    amount: number;
    currency: string;
    fees?: number;
  };
}

/**
 * Adaptateur Paystack (fournisseur principal, section 9.2) : cartes et
 * mobile money en XOF, prélèvements récurrents par carte. L'URL de base et
 * la clé secrète sont injectées pour rester testables sans appel réseau réel.
 */
@Injectable()
export class PaystackGateway implements RefundCapableGateway {
  readonly code = "PAYSTACK";
  readonly supportedMethods: readonly PaymentMethod[] = [
    "CARD",
    "ORANGE_MONEY",
    "MTN_MOMO",
    "MOOV_MONEY",
  ];

  private readonly logger = new Logger(PaystackGateway.name);
  private readonly baseUrl = process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co";

  constructor(private readonly secretKey: string) {}

  async initiate(order: PaymentOrder): Promise<Checkout> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({
        reference: order.reference,
        amount: order.amount,
        currency: order.currency,
        email: order.customerEmail ?? "no-reply@votredomaine.local",
        callback_url: order.callbackUrl,
        metadata: order.metadata,
      }),
    });

    const body = (await response.json()) as PaystackChargeResponse;
    if (!response.ok || !body.status) {
      throw new Error(`Échec d'initialisation Paystack pour la référence ${order.reference}.`);
    }

    return {
      checkoutUrl: body.data.authorization_url,
      providerReference: body.data.reference,
      isAsync: order.method !== "CARD",
    };
  }

  async verify(providerReference: string): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${providerReference}`, {
      headers: this.authHeaders(),
    });

    const body = (await response.json()) as PaystackChargeResponse;
    if (!response.ok) {
      throw new Error(`Échec de vérification Paystack pour la référence ${providerReference}.`);
    }

    return {
      providerReference: body.data.reference,
      status: this.mapStatus(body.data.status),
      amount: body.data.amount,
      currency: body.data.currency,
      providerFee: body.data.fees ?? 0,
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const response = await fetch(`${this.baseUrl}/refund`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify({ transaction: request.providerReference, amount: request.amount }),
    });

    const body = (await response.json()) as { status: boolean; data: { status: string; id: string } };
    if (!response.ok || !body.status) {
      throw new Error(`Échec de remboursement Paystack pour la référence ${request.providerReference}.`);
    }

    return {
      providerRefundReference: String(body.data.id),
      status: body.data.status === "processed" ? "SUCCEEDED" : "PENDING",
    };
  }

  /** BE-05: HMAC SHA-512 de la clé secrète sur le corps brut, comparé en temps constant. */
  verifySignature(event: RawWebhookEvent): boolean {
    const signature = event.headers["x-paystack-signature"];
    if (!signature) return false;

    const expected = createHmac("sha512", this.secretKey).update(event.rawBody).digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (signatureBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  parseEvent(event: RawWebhookEvent): ParsedWebhookEvent {
    const payload = JSON.parse(event.rawBody) as {
      event: string;
      data: { reference: string };
    };

    return {
      type: this.mapEventType(payload.event),
      providerReference: payload.data.reference,
      rawPayload: payload,
    };
  }

  private mapStatus(status: string): PaymentResult["status"] {
    if (status === "success") return "SUCCEEDED";
    if (status === "failed" || status === "abandoned") return "FAILED";
    return "PENDING";
  }

  /** Événements de renouvellement par carte (ADM-17, section 9.6). */
  private mapEventType(event: string): WebhookEventType {
    switch (event) {
      case "charge.success":
        return "PAYMENT_SUCCEEDED";
      case "invoice.payment_failed":
        return "SUBSCRIPTION_RENEWAL_FAILED";
      case "refund.processed":
        return "REFUND_PROCESSED";
      default:
        this.logger.debug(`Événement Paystack non géré: ${event}`);
        return "UNKNOWN";
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }
}
