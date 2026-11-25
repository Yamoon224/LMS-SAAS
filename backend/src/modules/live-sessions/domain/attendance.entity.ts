export interface AttendanceProps {
  id: string;
  liveSessionId: string;
  userId: string;
  joinedAt: Date | null;
  leftAt: Date | null;
  attended: boolean;
  /** ENT-57 : pointage manuel par l'entreprise ; prioritaire sur le suivi automatique de connexion. */
  markedManually?: boolean;
  markedById?: string | null;
  markedAt?: Date | null;
}

/**
 * Entité pure du domaine Attendance : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). RG-08(b): la présence effective (`attended`) conditionne
 * la validation du module — jamais la simple inscription à la session.
 */
export class Attendance {
  private constructor(private props: AttendanceProps) {}

  static fromPersistence(props: AttendanceProps): Attendance {
    return new Attendance(props);
  }

  get id(): string {
    return this.props.id;
  }

  get liveSessionId(): string {
    return this.props.liveSessionId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get attended(): boolean {
    return this.props.attended;
  }

  get markedManually(): boolean {
    return this.props.markedManually ?? false;
  }

  /** ENT-57 : l'entreprise marque l'apprenant présent ou absent ; le suivi automatique ne l'écrase plus. */
  markManually(present: boolean, markedById: string, at: Date = new Date()): void {
    this.props.attended = present;
    this.props.markedManually = true;
    this.props.markedById = markedById;
    this.props.markedAt = at;
  }

  recordJoin(at: Date = new Date()): void {
    this.props.joinedAt ??= at;
  }

  /**
   * RG-08(b): la présence n'est retenue que si l'apprenant est resté connecté
   * au moins `minAttendancePercent` de la durée de la session — une
   * connexion de quelques secondes ne doit jamais valider la présence.
   */
  recordLeave(sessionDurationMinutes: number, minAttendancePercent: number, at: Date = new Date()): void {
    this.props.leftAt = at;
    if (this.props.markedManually) return; // le pointage manuel prime sur la durée de connexion
    if (!this.props.joinedAt) {
      this.props.attended = false;
      return;
    }

    const attendedMinutes = (at.getTime() - this.props.joinedAt.getTime()) / (1000 * 60);
    const requiredMinutes = (sessionDurationMinutes * minAttendancePercent) / 100;
    this.props.attended = attendedMinutes >= requiredMinutes;
  }

  toSnapshot(): Readonly<AttendanceProps> {
    return { ...this.props };
  }
}
