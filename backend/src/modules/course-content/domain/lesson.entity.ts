import { DomainError } from "@shared/errors/domain-error";

import type { CompletionCriteria, ResourceType } from "./resource-type";

export class InvalidLessonContentError extends DomainError {
  readonly code = "CONTENU_LECON_INVALIDE";
}

export interface LessonProps {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  contentHtml: string | null;
  resourceType: ResourceType;
  storageUrl: string | null;
  isMandatory: boolean;
  completionCriteria: CompletionCriteria | null;
  downloadAllowed: boolean;
}

/**
 * Entité pure du domaine Lesson (ENT-23 à ENT-25) : aucune dépendance à
 * NestJS ou à l'ORM (section 13.2). Porte RG-08(a): "les contenus
 * obligatoires sont consultés selon leur critère" via isCompletedBy().
 */
export class Lesson {
  private constructor(private props: LessonProps) {}

  static fromPersistence(props: LessonProps): Lesson {
    return new Lesson(props);
  }

  get id(): string {
    return this.props.id;
  }

  get moduleId(): string {
    return this.props.moduleId;
  }

  get title(): string {
    return this.props.title;
  }

  get order(): number {
    return this.props.order;
  }

  get contentHtml(): string | null {
    return this.props.contentHtml;
  }

  get storageUrl(): string | null {
    return this.props.storageUrl;
  }

  get completionCriteria(): CompletionCriteria | null {
    return this.props.completionCriteria;
  }

  get downloadAllowed(): boolean {
    return this.props.downloadAllowed;
  }

  get isMandatory(): boolean {
    return this.props.isMandatory;
  }

  get resourceType(): ResourceType {
    return this.props.resourceType;
  }

  reorder(newOrder: number): void {
    this.props.order = newOrder;
  }

  /**
   * RG-08(a): un contenu obligatoire est consulté selon son critère propre
   * (ex. vidéo regardée à 90 %, PDF ouvert). Un contenu non obligatoire est
   * toujours considéré comme satisfait, quel que soit l'état de progression.
   */
  isCompletedBy(progress: { watchedPercent: number | null; opened: boolean }): boolean {
    if (!this.props.isMandatory) {
      return true;
    }

    const criteria = this.props.completionCriteria;
    if (!criteria) {
      return progress.opened;
    }

    if (criteria.watchedPercent !== undefined) {
      return (progress.watchedPercent ?? 0) >= criteria.watchedPercent;
    }

    if (criteria.requiresOpen) {
      return progress.opened;
    }

    return progress.opened;
  }
}
