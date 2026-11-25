import { SetMetadata } from "@nestjs/common";

export const SKIP_SUBSCRIPTION_CHECK_KEY = "skipSubscriptionCheck";

/**
 * Exempte une route du SubscriptionGuard sans la rendre publique.
 * Section 6, "Règle fondamentale": sans abonnement valide, le back-office
 * entreprise n'affiche que connexion, profil et Abonnement & facturation —
 * ces routes restent authentifiées mais ne doivent pas être bloquées par
 * l'absence d'abonnement (sinon on ne pourrait jamais en souscrire un).
 */
export const SkipSubscriptionCheck = (): MethodDecorator & ClassDecorator =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);
