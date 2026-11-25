import type { Invoice } from "./invoice";
import type { PaymentMethod, PaymentType } from "./payment-method";
import type { Payment } from "./payment.entity";

export interface CreatePaymentData {
  tenantId: string;
  providerId: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  currency: string;
  providerReference: string;
  subscriptionId?: string;
  enrollmentId?: string;
  creditPackId?: string;
  rawPayload?: unknown;
}

export interface PaymentRepositoryPort {
  findById(id: string): Promise<Payment | null>;
  /** Idempotence par référence (BE-05). */
  findByProviderReference(providerId: string, providerReference: string): Promise<Payment | null>;
  create(data: CreatePaymentData): Promise<Payment>;
  save(payment: Payment): Promise<void>;
  /** Factures de l'entreprise (paiements encaissés d'abonnement et de crédits), plus récentes d'abord. */
  listInvoices(tenantId: string): Promise<Invoice[]>;
  findInvoice(tenantId: string, paymentId: string): Promise<Invoice | null>;
  storeRawWebhookPayload(paymentId: string, payload: unknown): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol("PAYMENT_REPOSITORY");
