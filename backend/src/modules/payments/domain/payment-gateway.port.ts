import type {
  Checkout,
  ParsedWebhookEvent,
  PaymentOrder,
  PaymentResult,
  RawWebhookEvent,
  RefundRequest,
  RefundResult,
} from "./gateway.types";
import type { PaymentMethod } from "./payment-method";

/**
 * Petites interfaces ciblées plutôt qu'une interface géante que certains
 * fournisseurs ne sauraient pas honorer (ISP, section 13.1). Un fournisseur
 * de secours sans API de remboursement peut implémenter uniquement
 * PaymentInitiator + PaymentVerifier.
 */
export interface PaymentInitiator {
  initiate(order: PaymentOrder): Promise<Checkout>;
}

export interface PaymentVerifier {
  /** RG-06: re-vérification serveur de la transaction avant tout changement d'état. */
  verify(providerReference: string): Promise<PaymentResult>;
}

export interface RefundCapable {
  refund(request: RefundRequest): Promise<RefundResult>;
}

export interface WebhookReader {
  /** BE-05: vérifie la signature propre au fournisseur avant toute interprétation. */
  verifySignature(event: RawWebhookEvent): boolean;
  parseEvent(event: RawWebhookEvent): ParsedWebhookEvent;
}

/** Contrat complet qu'un fournisseur de paiement doit honorer pour être utilisable par le module. */
export interface PaymentGateway extends PaymentInitiator, PaymentVerifier, WebhookReader {
  readonly code: string;
  readonly supportedMethods: readonly PaymentMethod[];
}

/** Capacité optionnelle: tous les fournisseurs ne proposent pas de remboursement automatisé (section 9.2). */
export interface RefundCapableGateway extends PaymentGateway, RefundCapable {}

export function isRefundCapable(gateway: PaymentGateway): gateway is RefundCapableGateway {
  return typeof (gateway as Partial<RefundCapableGateway>).refund === "function";
}
