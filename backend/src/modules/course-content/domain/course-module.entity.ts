export interface CourseModuleProps {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  estimatedDurationMinutes: number | null;
}

/**
 * Entité pure du domaine Module (ENT-22) : aucune dépendance à NestJS ou à
 * l'ORM (section 13.2). Nommée CourseModule pour éviter la collision avec le
 * mot-clé/type `Module` de NestJS et de TypeScript lui-même.
 */
export class CourseModule {
  private constructor(private props: CourseModuleProps) {}

  static fromPersistence(props: CourseModuleProps): CourseModule {
    return new CourseModule(props);
  }

  get id(): string {
    return this.props.id;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get title(): string {
    return this.props.title;
  }

  get order(): number {
    return this.props.order;
  }

  reorder(newOrder: number): void {
    this.props.order = newOrder;
  }
}
