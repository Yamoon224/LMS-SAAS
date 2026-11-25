/**
 * Base class for all business/domain errors (cahier des charges 13.1: "gestion
 * d'erreurs explicite par des exceptions métier typées"). Pure TypeScript —
 * no dependency on NestJS so it can be thrown from the domain layer.
 *
 * `code` is a stable machine-readable identifier (e.g. "ABONNEMENT_REQUIS")
 * that the presentation layer maps to an HTTP status and that clients can
 * branch on, as required by BE-02.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
