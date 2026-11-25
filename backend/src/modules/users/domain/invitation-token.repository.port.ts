export interface InvitationTokenRecord {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

/**
 * Port pour la persistance des liens d'activation / réinitialisation
 * (ADM-05 "lien d'activation à durée limitée", ADM-06 "réinitialisation").
 * Le token brut n'est jamais stocké — seul son hash l'est.
 */
export interface InvitationTokenRepositoryPort {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findValidByHash(tokenHash: string): Promise<InvitationTokenRecord | null>;
  consume(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const INVITATION_TOKEN_REPOSITORY = Symbol("INVITATION_TOKEN_REPOSITORY");
