import type { Payment } from "./domain/payment.entity";

/**
 * Événements de domaine publics du module payments. Contrairement aux
 * fichiers de domain/application/infrastructure/presentation, ce fichier est
 * une sortie publique au même titre que la façade — les autres modules
 * peuvent s'y abonner (@OnEvent) sans violer les frontières de couches
 * (section 13.2, "communication entre modules... par événements de domaine").
 */
export class PaymentSucceededEvent {
  constructor(public readonly payment: Payment) {}
}

export class PaymentFailedEvent {
  constructor(public readonly payment: Payment) {}
}

export class RefundProcessedEvent {
  constructor(
    public readonly payment: Payment,
    /** Montant effectivement remboursé : inférieur à celui du paiement pour un remboursement partiel. */
    public readonly refundedAmount: number,
  ) {}
}

/** ADM-27 : un administrateur a rejoué le traitement d'un webhook en échec. Ni corps ni signature : seulement l'issue. */
export class WebhookReplayedEvent {
  constructor(
    public readonly webhookEventId: string,
    public readonly providerCode: string,
    public readonly outcome: string,
    public readonly actorUserId: string | null,
  ) {}
}

/** ENT-70 : un apprenant vient de déposer une demande ; l'entreprise doit l'examiner. */
export class RefundRequestedEvent {
  constructor(
    public readonly refundId: string,
    public readonly tenantId: string,
    public readonly courseTitle: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {}
}

/** ENT-70 : une demande de remboursement a changé d'état (acceptée, refusée ou remboursée). */
export class RefundRequestDecidedEvent {
  constructor(
    public readonly refundId: string,
    /** Apprenant à notifier ; null si l'inscription n'est plus rattachée à un compte. */
    public readonly learnerUserId: string | null,
    public readonly courseTitle: string,
    public readonly outcome: "ACCEPTED" | "REJECTED" | "REFUNDED",
    public readonly note: string | null,
    public readonly amount: number,
    public readonly currency: string,
  ) {}
}

/** Étape 31 : lien de paiement du prorata d'une montée en gamme immédiate, à transmettre à l'entreprise. */
export class ProrataPaymentRequestedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly subscriptionId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly checkoutUrl: string | null,
  ) {}
}
