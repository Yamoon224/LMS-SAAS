import type { UserType } from "@shared/domain/user-type";

/**
 * Nom du rôle Propriétaire d'entreprise, tel que créé par le module users (default-tenant-roles.ts). Dupliqué
 * ici : un module n'importe pas le domaine d'un autre (section 13.2). À garder synchronisé.
 */
export const OWNER_ROLE_NAME = "Propriétaire d'entreprise";

export const CHALLENGE_TTL_SECONDS = 300;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;

export type ChallengePurpose = "VERIFY" | "ENROLL";

/**
 * Exigence section 4.1/11 : la 2FA est obligatoire pour les comptes plateforme (administrateurs) et pour le
 * propriétaire d'une entreprise. Les autres comptes (apprenants, gestionnaires, formateurs) peuvent l'activer
 * volontairement.
 *
 * Développement uniquement : `TWO_FACTOR_MANDATORY=false` rend la 2FA optionnelle pour tous les comptes
 * (valeur par défaut : obligatoire, à ne jamais désactiver en production).
 */
export function isTwoFactorMandatory(account: { type: UserType; roles: readonly string[] }): boolean {
  if (process.env.TWO_FACTOR_MANDATORY === "false") return false;
  return account.type === "PLATFORM_ADMIN" || account.roles.includes(OWNER_ROLE_NAME);
}
