import type { UserType } from "@shared/domain/user-type";

export interface AuthUserRecord {
  id: string;
  tenantId: string | null;
  type: UserType;
  email: string;
  passwordHash: string | null;
  status: string;
  permissions: string[];
  roles: string[];
  twoFactorEnabled: boolean;
}

export interface AuthRepositoryPort {
  findByEmail(tenantId: string | null, email: string): Promise<AuthUserRecord | null>;
  findById(userId: string): Promise<AuthUserRecord | null>;
  /** Retrouve l'utilisateur propriétaire d'un jeton de rafraîchissement valide, à partir de son hash. */
  findByValidRefreshTokenHash(tokenHash: string): Promise<AuthUserRecord | null>;
  storeRefreshTokenHash(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  isRefreshTokenValid(userId: string, tokenHash: string): Promise<boolean>;
  revokeRefreshToken(userId: string, tokenHash: string): Promise<void>;
  /** Ferme toutes les sessions d'un utilisateur (ex. après un changement de mot de passe). */
  revokeAllRefreshTokens(userId: string): Promise<void>;
}

export const AUTH_REPOSITORY = Symbol("AUTH_REPOSITORY");
