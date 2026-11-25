/**
 * Cycle de vie d'un compte utilisateur plateforme ou entreprise (ADM-05, ADM-06, ENT-10).
 * INVITED: lien d'activation envoyé, mot de passe pas encore défini.
 * ACTIVE: compte opérationnel.
 * SUSPENDED: accès coupé temporairement (réversible), données conservées.
 * DEACTIVATED: désactivation définitive décidée par un gestionnaire/admin.
 */
export enum UserStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
}

const ALLOWED_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  [UserStatus.INVITED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
  [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.DEACTIVATED]: [],
};

export function canTransitionUserStatus(from: UserStatus, to: UserStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
