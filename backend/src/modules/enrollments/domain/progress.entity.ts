import { ProgressState } from "./progress-state";

export interface ProgressProps {
  id: string;
  enrollmentId: string;
  lessonId: string;
  state: ProgressState;
  watchedPercent: number | null;
  opened: boolean;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Entité pure du domaine Progress : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). Suit la consultation d'une leçon par un apprenant ; la
 * règle de "contenu obligatoire satisfait" (RG-08a) vit dans Lesson
 * (module course-content), consultée via CourseContentFacade.
 */
export class Progress {
  private constructor(private props: ProgressProps) {}

  static fromPersistence(props: ProgressProps): Progress {
    return new Progress(props);
  }

  get lessonId(): string {
    return this.props.lessonId;
  }

  get state(): ProgressState {
    return this.props.state;
  }

  get watchedPercent(): number | null {
    return this.props.watchedPercent;
  }

  get opened(): boolean {
    return this.props.opened;
  }

  recordView(watchedPercent?: number): void {
    this.props.startedAt ??= new Date();
    this.props.opened = true;
    if (watchedPercent !== undefined) {
      this.props.watchedPercent = watchedPercent;
    }
    if (this.props.state === ProgressState.NOT_STARTED) {
      this.props.state = ProgressState.IN_PROGRESS;
    }
  }

  markCompleted(): void {
    this.props.state = ProgressState.COMPLETED;
    this.props.completedAt ??= new Date();
  }

  toSnapshot(): Readonly<ProgressProps> {
    return { ...this.props };
  }
}
