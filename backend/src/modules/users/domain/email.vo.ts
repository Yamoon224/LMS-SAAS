import { DomainError } from "@shared/errors/domain-error";

export class InvalidEmailError extends DomainError {
  readonly code = "EMAIL_INVALIDE";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Value object garantissant un format d'e-mail valide, normalisé en minuscules. */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(value)) {
      throw new InvalidEmailError(`Adresse e-mail invalide: ${raw}`);
    }
    return new Email(value);
  }

  toString(): string {
    return this.value;
  }
}
