import type { Option } from "./option.vo";
import type { QuestionType } from "./question-type";

export interface QuestionProps {
  id: string;
  type: QuestionType;
  statementHtml: string;
  explanation: string | null;
  points: number;
  order: number;
  moduleWeight: string | null;
  options: Option[];
}

/**
 * Entité pure du domaine Question (ENT-27) : aucune dépendance à NestJS ou à
 * l'ORM (section 13.2). Porte la logique de correction — une question
 * multiple exige exactement l'ensemble des bonnes réponses, ni plus ni moins.
 */
export class Question {
  private constructor(private props: QuestionProps) {}

  static fromPersistence(props: QuestionProps): Question {
    return new Question(props);
  }

  get id(): string {
    return this.props.id;
  }

  get type(): QuestionType {
    return this.props.type;
  }

  get statementHtml(): string {
    return this.props.statementHtml;
  }

  get explanation(): string | null {
    return this.props.explanation;
  }

  get order(): number {
    return this.props.order;
  }

  get points(): number {
    return this.props.points;
  }

  get moduleWeight(): string | null {
    return this.props.moduleWeight;
  }

  get options(): readonly Option[] {
    return this.props.options;
  }

  get correctOptionIds(): string[] {
    return this.props.options.filter((option) => option.isCorrect).map((option) => option.id);
  }

  /**
   * RG-11/ENT-27: une réponse est correcte si l'ensemble des identifiants
   * sélectionnés correspond exactement à l'ensemble des bonnes réponses —
   * pour un QCM à réponse unique comme à réponses multiples, le critère est
   * le même (égalité d'ensembles), ce qui exclut qu'une sélection partielle
   * ou excédentaire soit comptée comme correcte.
   */
  isAnsweredCorrectly(selectedOptionIds: readonly string[]): boolean {
    const correct = new Set(this.correctOptionIds);
    const selected = new Set(selectedOptionIds);

    if (correct.size !== selected.size) {
      return false;
    }

    for (const id of correct) {
      if (!selected.has(id)) {
        return false;
      }
    }
    return true;
  }
}
