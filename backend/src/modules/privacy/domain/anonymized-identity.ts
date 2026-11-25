/** Nom affiché à la place du titulaire d'un compte supprimé (vérification publique d'un certificat, listes). */
export const DELETED_ACCOUNT_NAME = "Compte supprimé";

/** Suffixe réservé (TLD `.invalid`, RFC 2606) : une adresse anonymisée ne peut ni recevoir d'e-mail ni être saisie. */
export const ANONYMIZED_EMAIL_DOMAIN = "anonymized.invalid";

export interface AnonymizedIdentity {
  firstName: string;
  lastName: string;
  email: string;
  phone: null;
}

/**
 * Identité de remplacement. Elle ne dérive QUE de l'identifiant interne (un UUID aléatoire) : aucune donnée
 * d'origine n'y survit, donc l'opération est irréversible (pas de hachage de l'ancien e-mail, qui serait
 * réidentifiable par dictionnaire). L'identifiant garantit l'unicité de l'e-mail par entreprise tout en libérant
 * l'ancienne adresse pour un nouveau compte.
 */
export function anonymizedIdentity(userId: string): AnonymizedIdentity {
  return {
    firstName: "Compte",
    lastName: "supprimé",
    email: `deleted-${userId}@${ANONYMIZED_EMAIL_DOMAIN}`,
    phone: null,
  };
}

export function isAnonymizedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${ANONYMIZED_EMAIL_DOMAIN}`);
}
