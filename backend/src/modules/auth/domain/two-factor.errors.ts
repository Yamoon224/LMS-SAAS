import { DomainError } from "@shared/errors/domain-error";

/** Code TOTP / de récupération incorrect, expiré ou déjà utilisé (message volontairement unique). */
export class InvalidTwoFactorCodeError extends DomainError {
  readonly code = "CODE_2FA_INVALIDE";
}

/** Trop d'échecs : la vérification est suspendue temporairement. */
export class TwoFactorLockedError extends DomainError {
  readonly code = "VERIFICATION_2FA_VERROUILLEE";
}

/** Jeton de défi inconnu, expiré ou déjà utilisé. */
export class InvalidChallengeError extends DomainError {
  readonly code = "DEFI_2FA_INVALIDE";
}

export class TwoFactorAlreadyEnabledError extends DomainError {
  readonly code = "2FA_DEJA_ACTIVEE";
}

export class TwoFactorNotEnabledError extends DomainError {
  readonly code = "2FA_NON_ACTIVEE";
}

/** Désactivation refusée : la 2FA est obligatoire pour ce compte. */
export class TwoFactorMandatoryError extends DomainError {
  readonly code = "2FA_OBLIGATOIRE";
}

/** Appel de `enable` sans `setup` préalable. */
export class TwoFactorSetupMissingError extends DomainError {
  readonly code = "2FA_CONFIGURATION_ABSENTE";
}

export class TwoFactorResetNotAllowedError extends DomainError {
  readonly code = "REINITIALISATION_2FA_INTERDITE";
}
