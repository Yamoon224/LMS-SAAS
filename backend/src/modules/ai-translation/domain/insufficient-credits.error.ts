import { DomainError } from "@shared/errors";

/** RG: un débit ne peut jamais faire passer le solde de crédits IA sous zéro. */
export class InsufficientCreditsError extends DomainError {
  readonly code = "CREDITS_INSUFFISANTS";
}
