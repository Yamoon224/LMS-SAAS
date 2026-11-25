import { DomainError } from "@shared/errors";

/** RG-09: la leçon appartient à un module encore verrouillé (le module précédent n'est pas validé). */
export class ModuleLockedError extends DomainError {
  readonly code = "MODULE_VERROUILLE";
}
