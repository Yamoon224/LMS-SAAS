import type { PaymentMethod } from "./payment-method";

export interface PaymentOrder {
  /** Référence unique générée par la plateforme, jamais par le fournisseur (section 9.6). */
  reference: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  /** Métadonnées transmises au fournisseur et renvoyées telles quelles dans le webhook (tenant, type, objet). */
  metadata: { tenantId: string; type: string; objectId: string };
  customerEmail?: string;
  callbackUrl?: string;
}

export interface Checkout {
  /** URL de paiement (carte) ou instructions affichées (mobile money asynchrone). */
  checkoutUrl?: string;
  providerReference: string;
  /** true si le moyen de paiement est asynchrone (mobile money: validation sur le téléphone, section 9.6). */
  isAsync: boolean;
}

export interface PaymentResult {
  providerReference: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  amount: number;
  currency: string;
  providerFee: number;
}

export interface RefundRequest {
  providerReference: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  providerRefundReference: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
}

/** Événement brut reçu d'un webhook, avant interprétation (BE-05: stockage brut des événements reçus). */
export interface RawWebhookEvent {
  headers: Record<string, string>;
  rawBody: string;
}

export type WebhookEventType =
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "REFUND_PROCESSED"
  | "SUBSCRIPTION_RENEWAL_FAILED"
  | "UNKNOWN";

export interface ParsedWebhookEvent {
  type: WebhookEventType;
  providerReference: string;
  rawPayload: unknown;
}
