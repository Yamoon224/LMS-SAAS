import type { PaymentGateway } from "./payment-gateway.port";
import type { PaymentMethod } from "./payment-method";

/**
 * BE-04: "routage par moyen de paiement et bascule si un fournisseur est
 * indisponible". Le registre connaît tous les fournisseurs actifs et leur
 * priorité par moyen de paiement (configurée par l'Admin, ADM-20).
 */
export interface PaymentGatewayRegistryPort {
  /** Fournisseur prioritaire actif pour ce moyen de paiement, ou son fournisseur de secours. */
  resolveForMethod(method: PaymentMethod): Promise<PaymentGateway>;
  findByCode(code: string): Promise<PaymentGateway | null>;
}

export const PAYMENT_GATEWAY_REGISTRY = Symbol("PAYMENT_GATEWAY_REGISTRY");
