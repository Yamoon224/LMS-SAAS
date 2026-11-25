import { DomainError } from "./domain-error";

/** Thrown by the tenant guard when the request's tenant cannot be resolved or is inactive. */
export class TenantNotResolvedError extends DomainError {
  readonly code = "TENANT_NON_RESOLU";
}

/** Thrown when a JWT's tenant claim does not match the tenant resolved from the Host header (BE-01). */
export class TenantMismatchError extends DomainError {
  readonly code = "TENANT_MISMATCH";
}

/** Thrown by the subscription guard when the tenant has no valid subscription (BE-02, RG-01). */
export class SubscriptionRequiredError extends DomainError {
  readonly code = "ABONNEMENT_REQUIS";
}

/** Thrown by the quota guard when a plan limit is reached before a creation (BE-03, RG-03). */
export class QuotaExceededError extends DomainError {
  readonly code = "QUOTA_DEPASSE";

  constructor(
    message: string,
    public readonly quotaName: string,
  ) {
    super(message);
  }
}

/** Thrown when the caller lacks the permission required for the action (RBAC). */
export class ForbiddenActionError extends DomainError {
  readonly code = "ACTION_INTERDITE";
}

/** Thrown when a requested entity does not exist (or is outside the caller's tenant). */
export class NotFoundDomainError extends DomainError {
  readonly code = "RESSOURCE_INTROUVABLE";
}

/** Thrown when an entity is not in a state that allows the requested transition. */
export class InvalidStateTransitionError extends DomainError {
  readonly code = "TRANSITION_INVALIDE";
}
