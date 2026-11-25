import { DomainError } from "@shared/errors/domain-error";

export class WrongPasswordError extends DomainError {
  readonly code = "MOT_DE_PASSE_INCORRECT";
}

/** Suppression refusée : un paiement ou un remboursement est encore en cours (le motif est montré à l'apprenant). */
export class AccountDeletionBlockedError extends DomainError {
  readonly code = "SUPPRESSION_COMPTE_BLOQUEE";
}

export class AccountAlreadyDeletedError extends DomainError {
  readonly code = "COMPTE_DEJA_SUPPRIME";
}
