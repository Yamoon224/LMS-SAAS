import type { AuthUserRecord } from "./auth.repository.port";
import type { ChallengePurpose } from "./two-factor.policy";

/** Compte avec son état 2FA (le secret reste chiffré : seul le cas d'usage le déchiffre). */
export interface TwoFactorUserRecord extends AuthUserRecord {
  twoFactorSecretEncrypted: string | null;
  lastStep: number | null;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface ChallengeRecord {
  id: string;
  userId: string;
  purpose: ChallengePurpose;
}

export interface RecoveryCodeRecord {
  id: string;
  codeHash: string;
}

export interface TwoFactorRepositoryPort {
  findUser(userId: string): Promise<TwoFactorUserRecord | null>;
  /** Enregistre un secret en attente de confirmation (2FA toujours désactivée). Écrase un précédent secret en attente. */
  savePendingSecret(userId: string, encryptedSecret: string): Promise<void>;
  /** Active la 2FA : mémorise le pas du premier code (anti-rejeu) et remet à zéro les échecs. */
  enable(userId: string, lastStep: number): Promise<void>;
  /** Désactive : efface secret, pas, échecs, verrou et codes de récupération. */
  disable(userId: string): Promise<void>;
  /** Remplace atomiquement tous les codes de récupération par de nouveaux hashs. */
  replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void>;
  listUnusedRecoveryCodes(userId: string): Promise<RecoveryCodeRecord[]>;
  /** Marque un code comme utilisé ; faux si un appel concurrent l'a déjà consommé. */
  consumeRecoveryCode(codeId: string): Promise<boolean>;
  /** Enregistre le pas TOTP accepté ; faux s'il n'est pas strictement supérieur au dernier (rejeu concurrent). */
  acceptStep(userId: string, step: number): Promise<boolean>;
  /** Compte un échec ; au-delà du plafond, pose le verrou et remet le compteur à zéro. Renvoie le verrou posé. */
  registerFailure(userId: string, maxAttempts: number, lockUntil: Date): Promise<Date | null>;
  resetFailures(userId: string): Promise<void>;
  createChallenge(userId: string, purpose: ChallengePurpose, tokenHash: string, expiresAt: Date): Promise<void>;
  /** Défi non expiré et non consommé correspondant au hash. */
  findActiveChallenge(tokenHash: string, now: Date): Promise<ChallengeRecord | null>;
  /** Consomme le défi ; faux s'il l'était déjà (usage unique). */
  consumeChallenge(challengeId: string): Promise<boolean>;
  /** Invalide les défis en cours d'un utilisateur (réinitialisation, désactivation). */
  deleteChallenges(userId: string): Promise<void>;
  /** Réinitialisation par un administrateur : tout effacer, y compris le verrou. */
  resetAll(userId: string): Promise<void>;
}

export const TWO_FACTOR_REPOSITORY = Symbol("TWO_FACTOR_REPOSITORY");

export interface QrCodeGeneratorPort {
  toDataUrl(content: string): Promise<string>;
}

export const QR_CODE_GENERATOR = Symbol("QR_CODE_GENERATOR");
