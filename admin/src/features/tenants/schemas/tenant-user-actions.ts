import type { TenantUser } from "./tenant-overview.schema";

/** Doit rester synchronisé avec TENANT_OWNER_ROLE_NAME (backend, module users). */
export const OWNER_ROLE_NAME = "Propriétaire d'entreprise";

export type TenantUserActionKind =
  | "suspend"
  | "reactivate"
  | "resendInvitation"
  | "passwordReset"
  | "reset2fa"
  | "transferOwnership";

export function isOwner(user: Pick<TenantUser, "roles">): boolean {
  return user.roles.includes(OWNER_ROLE_NAME);
}

/**
 * Actions proposées pour un compte (ADM-06). Reflète les gardes du backend (qui reste l'autorité) pour ne montrer
 * que des actions possibles : suspendre/réinitialiser = compte actif ; réactiver = suspendu ; invitation = invité ;
 * 2FA = déjà activée ; transfert = compte actif qui n'est pas déjà propriétaire.
 */
export function availableUserActions(user: Pick<TenantUser, "status" | "roles" | "twoFactorEnabled">): TenantUserActionKind[] {
  const actions: TenantUserActionKind[] = [];
  if (user.status === "ACTIVE") actions.push("suspend", "passwordReset");
  if (user.status === "SUSPENDED") actions.push("reactivate");
  if (user.status === "INVITED") actions.push("resendInvitation");
  if (user.twoFactorEnabled && user.status !== "DEACTIVATED") actions.push("reset2fa");
  if (user.status === "ACTIVE" && !isOwner(user)) actions.push("transferOwnership");
  return actions;
}

/** Nombre de propriétaires actifs (le dernier ne peut pas être suspendu : message préventif dans la confirmation). */
export function activeOwnersCount(users: Pick<TenantUser, "status" | "roles">[]): number {
  return users.filter((user) => user.status === "ACTIVE" && isOwner(user)).length;
}
