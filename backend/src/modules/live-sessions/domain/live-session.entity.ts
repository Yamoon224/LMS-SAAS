import { DomainError, InvalidStateTransitionError } from "@shared/errors";

import { canTransitionLiveSessionStatus, LiveSessionStatus } from "./live-session-status";

export class SessionFullError extends DomainError {
  readonly code = "SESSION_COMPLETE";
}

export class SessionAlreadyPassedError extends DomainError {
  readonly code = "SESSION_DEJA_PASSEE";
}

export interface LiveSessionProps {
  id: string;
  tenantId: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  startAt: Date;
  durationMinutes: number;
  timezone: string;
  status: LiveSessionStatus;
  meetLink: string | null;
  googleEventId: string | null;
  capacity: number | null;
  replayUrl: string | null;
  createdAt: Date;
}

/**
 * Entité pure du domaine LiveSession : aucune dépendance à NestJS, à l'ORM
 * ou à l'API Google (section 13.2). Porte ENT-52 à ENT-58 (planification,
 * capacité, annulation, replay).
 */
export class LiveSession {
  private constructor(private props: LiveSessionProps) {}

  static fromPersistence(props: LiveSessionProps): LiveSession {
    return new LiveSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get courseId(): string {
    return this.props.courseId;
  }

  get moduleId(): string | null {
    return this.props.moduleId;
  }

  get title(): string {
    return this.props.title;
  }

  get startAt(): Date {
    return this.props.startAt;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get status(): LiveSessionStatus {
    return this.props.status;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get meetLink(): string | null {
    return this.props.meetLink;
  }

  get capacity(): number | null {
    return this.props.capacity;
  }

  get replayUrl(): string | null {
    return this.props.replayUrl;
  }

  /** ENT-52: capacité optionnelle — null = illimitée. */
  hasAvailableSeat(currentRegistrations: number): boolean {
    if (this.props.capacity === null) return true;
    return currentRegistrations < this.props.capacity;
  }

  attachGoogleMeet(meetLink: string, googleEventId: string): void {
    this.props.meetLink = meetLink;
    this.props.googleEventId = googleEventId;
  }

  private transitionTo(status: LiveSessionStatus): void {
    if (!canTransitionLiveSessionStatus(this.props.status, status)) {
      throw new InvalidStateTransitionError(
        `Transition de session live invalide: ${this.props.status} → ${status}.`,
      );
    }
    this.props.status = status;
  }

  start(): void {
    this.transitionTo(LiveSessionStatus.IN_PROGRESS);
  }

  complete(): void {
    this.transitionTo(LiveSessionStatus.COMPLETED);
  }

  /** ENT-56: annulation seulement avant la tenue de la session. */
  cancel(): void {
    if (this.props.status !== LiveSessionStatus.SCHEDULED) {
      throw new SessionAlreadyPassedError("Seule une session planifiée peut être annulée.");
    }
    this.transitionTo(LiveSessionStatus.CANCELED);
  }

  /** ENT-57: dépôt du replay après la tenue de la session. */
  setReplayUrl(replayUrl: string): void {
    this.props.replayUrl = replayUrl;
  }

  toSnapshot(): Readonly<LiveSessionProps> {
    return { ...this.props };
  }
}
