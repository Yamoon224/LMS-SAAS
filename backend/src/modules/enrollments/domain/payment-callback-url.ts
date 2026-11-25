export interface PaymentCallbackInput {
  /** Slug du tenant de l'apprenant (hôte « learning » = `<slug>.<domaine>`). */
  tenantSlug: string;
  baseDomain: string;
  protocol?: string;
  enrollmentId: string;
}

/**
 * URL de retour après paiement, construite CÔTÉ SERVEUR (jamais fournie par le client, donc aucune
 * redirection ouverte) : page de suivi de l'inscription sur le sous-domaine d'apprentissage du tenant.
 * L'activation n'est jamais déduite de ce retour: elle vient uniquement du webhook (RG-06).
 */
export function buildPaymentCallbackUrl(input: PaymentCallbackInput): string {
  const protocol = input.protocol ?? "https";
  return `${protocol}://${input.tenantSlug}.${input.baseDomain}/my-learning/${encodeURIComponent(input.enrollmentId)}?payment=return`;
}
