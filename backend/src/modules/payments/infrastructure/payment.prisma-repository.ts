import { Injectable } from "@nestjs/common";
import type { Prisma, Payment as PrismaPayment } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { buildInvoiceNumber, INVOICEABLE_STATUSES, INVOICEABLE_TYPES } from "../domain/invoice";
import type { Invoice } from "../domain/invoice";
import type { PaymentMethod, PaymentStatus, PaymentType } from "../domain/payment-method";
import { Payment } from "../domain/payment.entity";
import type { CreatePaymentData, PaymentRepositoryPort } from "../domain/payment.repository.port";

const INVOICE_INCLUDE = {
  creditPack: { select: { name: true, creditsAmount: true } },
  subscription: { select: { planPrice: { select: { period: true, plan: { select: { name: true } } } } } },
} satisfies Prisma.PaymentInclude;

type InvoiceRecord = Prisma.PaymentGetPayload<{ include: typeof INVOICE_INCLUDE }>;

const PERIOD_LABELS: Record<string, string> = { MONTHLY: "mensuel", QUARTERLY: "trimestriel", YEARLY: "annuel" };

function describeInvoice(record: InvoiceRecord): string {
  if (record.type === "CREDIT_PURCHASE" && record.creditPack) {
    return `Pack de crédits IA « ${record.creditPack.name} » (${record.creditPack.creditsAmount} crédits)`;
  }
  const planPrice = record.subscription?.planPrice;
  if (planPrice) {
    return `Abonnement ${planPrice.plan.name} (${PERIOD_LABELS[planPrice.period] ?? planPrice.period})`;
  }
  return record.type === "SUBSCRIPTION" ? "Abonnement" : "Achat de crédits IA";
}

@Injectable()
export class PaymentPrismaRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Payment | null> {
    const record = await this.prisma.payment.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  /**
   * `providerId` accepte l'identifiant de la configuration du fournisseur OU son code (ex. PAYSTACK) : le webhook ne
   * connaît que le code, alors que `Payment.providerId` référence la configuration. Un identifiant (UUID) est cherché
   * tel quel, un code par la relation `provider`.
   */
  async findByProviderReference(providerId: string, providerReference: string): Promise<Payment | null> {
    const isConfigId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId);
    const record = isConfigId
      ? await this.prisma.payment.findUnique({
          where: { providerId_providerReference: { providerId, providerReference } },
        })
      : await this.prisma.payment.findFirst({
          where: { providerReference, provider: { code: providerId as never } },
        });
    return record ? this.toDomain(record) : null;
  }

  async create(data: CreatePaymentData): Promise<Payment> {
    const record = await this.prisma.payment.create({
      data: {
        tenantId: data.tenantId,
        providerId: data.providerId,
        type: data.type,
        method: data.method,
        amount: data.amount,
        currency: data.currency,
        providerReference: data.providerReference,
        subscriptionId: data.subscriptionId,
        enrollmentId: data.enrollmentId,
        creditPackId: data.creditPackId,
        rawPayload: data.rawPayload as object | undefined,
      },
    });
    return this.toDomain(record);
  }

  async save(payment: Payment): Promise<void> {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: payment.status,
        providerFee: payment.providerFee,
        commissionAmount: payment.commissionAmount,
        failureReason: payment.failureReason,
      },
    });
  }

  async listInvoices(tenantId: string): Promise<Invoice[]> {
    const records = await this.prisma.payment.findMany({
      where: this.invoiceWhere(tenantId),
      include: INVOICE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toInvoice(record));
  }

  async findInvoice(tenantId: string, paymentId: string): Promise<Invoice | null> {
    const record = await this.prisma.payment.findFirst({
      where: { ...this.invoiceWhere(tenantId), id: paymentId },
      include: INVOICE_INCLUDE,
    });
    return record ? this.toInvoice(record) : null;
  }

  async storeRawWebhookPayload(paymentId: string, payload: unknown): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { rawPayload: payload as object },
    });
  }

  private invoiceWhere(tenantId: string): Prisma.PaymentWhereInput {
    return {
      tenantId,
      type: { in: [...INVOICEABLE_TYPES] },
      status: { in: [...INVOICEABLE_STATUSES] },
    };
  }

  private toInvoice(record: InvoiceRecord): Invoice {
    return {
      paymentId: record.id,
      number: buildInvoiceNumber(record.id, record.createdAt),
      type: record.type as PaymentType,
      method: record.method as PaymentMethod,
      status: record.status as PaymentStatus,
      description: describeInvoice(record),
      amount: record.amount,
      currency: record.currency,
      issuedAt: record.createdAt,
    };
  }

  private toDomain(record: PrismaPayment): Payment {
    return Payment.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      providerId: record.providerId,
      type: record.type as PaymentType,
      method: record.method as PaymentMethod,
      amount: record.amount,
      currency: record.currency,
      providerFee: record.providerFee,
      commissionAmount: record.commissionAmount,
      providerReference: record.providerReference,
      status: record.status as PaymentStatus,
      subscriptionId: record.subscriptionId,
      enrollmentId: record.enrollmentId,
      creditPackId: record.creditPackId,
      failureReason: record.failureReason,
    });
  }
}
