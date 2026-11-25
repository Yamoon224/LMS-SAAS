import { InvalidStateTransitionError } from "@shared/errors";

import { canTransitionCourseStatus, CourseStatus } from "./course-status";
import type { CourseType, ProgressionMode } from "./course-type";

export interface CourseProps {
  id: string;
  tenantId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: CourseType;
  status: CourseStatus;
  progressionMode: ProgressionMode;
  sourceLocale: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  accessDurationDays: number | null;
  category: string | null;
  level: string | null;
  estimatedDurationMinutes: number | null;
  coverImageUrl: string | null;
  instructorIds: string[];
  publishedAt: Date | null;
  /** ENT-38: modèle de certificat choisi pour cette formation ; null = modèle par défaut du tenant. */
  certificateTemplateId: string | null;
}

/**
 * Entité pure du domaine Course : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Porte les règles ENT-15 à ENT-21.
 */
export class Course {
  private constructor(private props: CourseProps) {}

  static fromPersistence(props: CourseProps): Course {
    return new Course(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get title(): string {
    return this.props.title;
  }

  get subtitle(): string | null {
    return this.props.subtitle;
  }

  get description(): string | null {
    return this.props.description;
  }

  get status(): CourseStatus {
    return this.props.status;
  }

  get type(): CourseType {
    return this.props.type;
  }

  get price(): number {
    return this.props.price;
  }

  get compareAtPrice(): number | null {
    return this.props.compareAtPrice;
  }

  get currency(): string {
    return this.props.currency;
  }

  /** ENT-16: durée d'accès en jours après inscription ; null = illimitée. */
  get accessDurationDays(): number | null {
    return this.props.accessDurationDays;
  }

  get category(): string | null {
    return this.props.category;
  }

  get level(): string | null {
    return this.props.level;
  }

  get estimatedDurationMinutes(): number | null {
    return this.props.estimatedDurationMinutes;
  }

  get coverImageUrl(): string | null {
    return this.props.coverImageUrl;
  }

  get publishedAt(): Date | null {
    return this.props.publishedAt;
  }

  get sourceLocale(): string {
    return this.props.sourceLocale;
  }

  get instructorIds(): readonly string[] {
    return this.props.instructorIds;
  }

  get progressionMode(): ProgressionMode {
    return this.props.progressionMode;
  }

  get certificateTemplateId(): string | null {
    return this.props.certificateTemplateId;
  }

  isPurchasable(): boolean {
    return this.props.status === CourseStatus.PUBLISHED;
  }

  /** ENT-21: la modification d'une formation publiée ne casse pas la progression des inscrits. */
  isEditable(): boolean {
    return this.props.status !== CourseStatus.ARCHIVED;
  }

  private transitionTo(status: CourseStatus): void {
    if (!canTransitionCourseStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition de formation invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  /** ENT-18: publication, avec aperçu "vue apprenant" déjà fait par l'appelant avant cet appel. */
  publish(): void {
    this.transitionTo(CourseStatus.PUBLISHED);
    this.props.publishedAt ??= new Date();
  }

  /** ENT-18: masquage — accès des inscrits conservé (vérifié côté module enrollments, pas ici). */
  hide(): void {
    this.transitionTo(CourseStatus.HIDDEN);
  }

  archive(): void {
    this.transitionTo(CourseStatus.ARCHIVED);
  }
}
