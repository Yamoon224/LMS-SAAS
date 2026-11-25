export interface OptionProps {
  id: string;
  label: string;
  isCorrect: boolean;
  order: number;
}

/** ENT-27: une réponse possible à une question. Value object (pas d'identité métier propre hors de sa question). */
export class Option {
  private constructor(private props: OptionProps) {}

  static fromPersistence(props: OptionProps): Option {
    return new Option(props);
  }

  get id(): string {
    return this.props.id;
  }

  get label(): string {
    return this.props.label;
  }

  get isCorrect(): boolean {
    return this.props.isCorrect;
  }

  get order(): number {
    return this.props.order;
  }
}
