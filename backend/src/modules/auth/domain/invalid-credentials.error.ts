import { DomainError } from "@shared/errors/domain-error";

export class InvalidCredentialsError extends DomainError {
  readonly code = "IDENTIFIANTS_INVALIDES";
}

export class AccountNotActiveError extends DomainError {
  readonly code = "COMPTE_INACTIF";
}
