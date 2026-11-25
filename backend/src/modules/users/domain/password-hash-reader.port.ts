/** Port de lecture de l'empreinte du mot de passe (ré-authentification pour les actions sensibles, ENT-11). */
export interface PasswordHashReaderPort {
  /** `null` si l'utilisateur est inconnu ou n'a pas de mot de passe. */
  getPasswordHash(userId: string): Promise<string | null>;
}

export const PASSWORD_HASH_READER = Symbol("PASSWORD_HASH_READER");
