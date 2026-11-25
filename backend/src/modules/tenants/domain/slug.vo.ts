import { isReservedSlug, SLUG_FORMAT_REGEX } from "@shared/constants/reserved-slugs";
import { DomainError } from "@shared/errors/domain-error";

export class InvalidSlugError extends DomainError {
  readonly code = "SLUG_INVALIDE";
}

/**
 * Value object garantissant qu'un slug respecte le format et les règles
 * métier (section 3.2 et 3.3) avant qu'il n'atteigne la persistance :
 * minuscules/chiffres/tirets, ni liste réservée, ni suffixe -backoffice.
 */
export class Slug {
  private constructor(public readonly value: string) {}

  static create(raw: string): Slug {
    const value = raw.trim().toLowerCase();

    if (!SLUG_FORMAT_REGEX.test(value)) {
      throw new InvalidSlugError(
        "Le slug doit être en minuscules, avec chiffres et tirets uniquement.",
      );
    }

    if (isReservedSlug(value)) {
      throw new InvalidSlugError(
        `Le slug "${value}" est réservé ou se termine par -backoffice.`,
      );
    }

    return new Slug(value);
  }

  toString(): string {
    return this.value;
  }
}
