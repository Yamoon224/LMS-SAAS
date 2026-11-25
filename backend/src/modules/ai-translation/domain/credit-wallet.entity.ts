import { InsufficientCreditsError } from "./insufficient-credits.error";

export interface CreditWalletProps {
  id: string;
  tenantId: string;
  balance: number;
}

/**
 * Entité pure du domaine CreditWallet : aucune dépendance à NestJS ou à
 * l'ORM (section 13.2). Porte la règle "le solde ne peut jamais devenir
 * négatif" — chaque mouvement est par ailleurs tracé par une
 * CreditLedgerEntry séparée (infrastructure), jamais recalculé depuis le
 * solde seul.
 */
export class CreditWallet {
  private constructor(private props: CreditWalletProps) {}

  static fromPersistence(props: CreditWalletProps): CreditWallet {
    return new CreditWallet(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get balance(): number {
    return this.props.balance;
  }

  hasSufficientCredits(amount: number): boolean {
    return this.props.balance >= amount;
  }

  credit(amount: number): void {
    this.props.balance += amount;
  }

  debit(amount: number): void {
    if (!this.hasSufficientCredits(amount)) {
      throw new InsufficientCreditsError(
        `Solde de crédits IA insuffisant: ${this.props.balance} disponible(s), ${amount} requis.`,
      );
    }
    this.props.balance -= amount;
  }

  toSnapshot(): Readonly<CreditWalletProps> {
    return { ...this.props };
  }
}
