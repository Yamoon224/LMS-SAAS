import type { LearnerDataExport } from "./learner-data-export";

export interface PrivacyAccount {
  id: string;
  tenantId: string | null;
  type: string;
  passwordHash: string | null;
  anonymizedAt: Date | null;
}

export interface DeletionBlockers {
  /** Paiements d'inscriptions du compte encore en cours (non conclus). */
  pendingPayments: number;
  /** Demandes de remboursement non résolues (litige) sur les paiements du compte. */
  openRefunds: number;
}

/** Port d'accès aux données personnelles ; l'implémentation Prisma lit/écrit plusieurs tables en une transaction. */
export interface PrivacyRepositoryPort {
  findAccount(userId: string): Promise<PrivacyAccount | null>;
  collectLearnerData(userId: string, exportedAt: Date): Promise<LearnerDataExport | null>;
  findDeletionBlockers(userId: string): Promise<DeletionBlockers>;
  /**
   * Anonymise le compte en une transaction (identité remplacée, mot de passe/2FA effacés, sessions révoquées,
   * jetons d'activation supprimés, notifications supprimées, nom des certificats remplacé). Retourne faux si le
   * compte était déjà anonymisé (atomique : une seule exécution concurrente l'emporte).
   */
  anonymizeLearner(userId: string, now: Date): Promise<boolean>;
  /** Supprime les notifications lues avant `cutoff` ; retourne le nombre supprimé. */
  deleteReadNotificationsBefore(cutoff: Date): Promise<number>;
  /** Apprenants sans aucune activité depuis `cutoff` et pas encore anonymisés. */
  listInactiveLearnerIds(cutoff: Date, limit: number): Promise<string[]>;
}

export const PRIVACY_REPOSITORY = Symbol("PRIVACY_REPOSITORY");
