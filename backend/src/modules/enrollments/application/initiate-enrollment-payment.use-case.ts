import { PaymentsFacade } from "@modules/payments/payments.facade";
import { TenantsFacade } from "@modules/tenants/tenants.facade";
import { UsersFacade } from "@modules/users/users.facade";
import { Injectable } from "@nestjs/common";
import { DomainError, NotFoundDomainError } from "@shared/errors";

import { EnrollmentStatus } from "../domain/enrollment-status";
import { buildPaymentCallbackUrl } from "../domain/payment-callback-url";

import { GetEnrollmentUseCase } from "./get-enrollment.use-case";

/** Moyens de paiement acceptés par la route (miroir du type `PaymentMethod` du module payments). */
export const ENROLLMENT_PAYMENT_METHODS = ["CARD", "ORANGE_MONEY", "MTN_MOMO", "MOOV_MONEY", "WAVE", "OTHER"] as const;
export type EnrollmentPaymentMethod = (typeof ENROLLMENT_PAYMENT_METHODS)[number];

export class EnrollmentNotPayableError extends DomainError {
  readonly code = "INSCRIPTION_NON_PAYABLE";
}

export class PaymentMethodUnavailableError extends DomainError {
  readonly code = "MOYEN_PAIEMENT_INDISPONIBLE";
}

export interface InitiateEnrollmentPaymentResult {
  paymentId: string;
  checkoutUrl: string | null;
  providerReference: string;
  /** true: paiement asynchrone (mobile money) — validation sur le téléphone, l'activation viendra du webhook. */
  isAsync: boolean;
}

/**
 * PUB-07/RG-05/RG-06: lance le paiement en ligne d'une inscription en attente. Le montant et la devise
 * sont ceux figés à l'inscription (`pricePaid`) — jamais ceux du client ; l'e-mail est celui du compte
 * authentifié ; l'URL de retour est construite côté serveur. L'inscription n'est PAS activée ici :
 * seule la confirmation du fournisseur (webhook `payment.succeeded`) l'active.
 */
@Injectable()
export class InitiateEnrollmentPaymentUseCase {
  constructor(
    private readonly getEnrollmentUseCase: GetEnrollmentUseCase,
    private readonly paymentsFacade: PaymentsFacade,
    private readonly usersFacade: UsersFacade,
    private readonly tenantsFacade: TenantsFacade,
  ) {}

  async execute(input: {
    enrollmentId: string;
    userId: string;
    tenantId: string;
    method: EnrollmentPaymentMethod;
  }): Promise<InitiateEnrollmentPaymentResult> {
    const enrollment = await this.getEnrollmentUseCase.executeOwned(input.enrollmentId, input.userId, input.tenantId);

    if (enrollment.status !== EnrollmentStatus.PENDING_PAYMENT || enrollment.pricePaid <= 0) {
      throw new EnrollmentNotPayableError("Cette inscription n'est pas en attente de paiement en ligne.");
    }

    const available = await this.paymentsFacade.listAvailableMethods();
    if (!available.includes(input.method)) {
      throw new PaymentMethodUnavailableError(`Le moyen de paiement ${input.method} n'est pas disponible actuellement.`);
    }

    const [user, tenant] = await Promise.all([
      this.usersFacade.findById(input.userId),
      this.tenantsFacade.findById(input.tenantId),
    ]);
    if (!user || !tenant) {
      throw new NotFoundDomainError("Compte ou entreprise introuvable.");
    }

    const { paymentId, checkout } = await this.paymentsFacade.initiatePayment({
      tenantId: input.tenantId,
      type: "COURSE_ENROLLMENT",
      method: input.method,
      amount: enrollment.pricePaid,
      currency: enrollment.currency,
      objectId: enrollment.id,
      enrollmentId: enrollment.id,
      customerEmail: user.email,
      callbackUrl: buildPaymentCallbackUrl({
        tenantSlug: tenant.slug,
        baseDomain: process.env.APP_BASE_DOMAIN ?? "votredomaine.local",
        protocol: process.env.APP_URL_PROTOCOL ?? "https",
        enrollmentId: enrollment.id,
      }),
    });

    return {
      paymentId,
      checkoutUrl: checkout.checkoutUrl ?? null,
      providerReference: checkout.providerReference,
      isAsync: checkout.isAsync,
    };
  }
}
