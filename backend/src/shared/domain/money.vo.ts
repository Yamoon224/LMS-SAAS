import { DomainError } from "@shared/errors/domain-error";

export class InvalidAmountError extends DomainError {
  readonly code = "MONTANT_INVALIDE";
}

/**
 * Value object Montant (BE-07): toujours stocké en entier, dans la plus
 * petite unité de la devise. Le FCFA (XOF) n'a pas de décimales — un
 * montant en XOF doit donc déjà être l'unité complète (ex. 50000 = 50 000 FCFA).
 * Partagé entre modules (payments, courses, plans...) — placé ici plutôt que
 * dans un seul module pour éviter une dépendance inter-module artificielle
 * sur un simple value object sans état métier propre à un domaine.
 */
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {}

  static create(amount: number, currency: string): Money {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new InvalidAmountError(
        `Le montant doit être un entier positif (plus petite unité de la devise) : ${amount}`,
      );
    }
    return new Money(amount, currency.toUpperCase());
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amount > this.amount) {
      throw new InvalidAmountError("Le montant soustrait dépasse le montant disponible.");
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  /** Calcule un pourcentage du montant, arrondi à l'entier le plus proche (BE-07, arrondi documenté). */
  percentage(percent: number): Money {
    return new Money(Math.round((this.amount * percent) / 100), this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new InvalidAmountError(
        `Impossible d'opérer sur des devises différentes : ${this.currency} vs ${other.currency}`,
      );
    }
  }
}
