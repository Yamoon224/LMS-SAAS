export interface AuditEntryProps {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Entité pure du domaine AuditEntry : aucune dépendance à NestJS ou à l'ORM
 * (section 13.2). RG-19: "toute action sensible est inscrite au journal
 * d'audit, non modifiable" — cette entité n'expose donc aucune méthode de
 * mutation : une entrée d'audit se crée et se lit, elle ne se corrige jamais.
 */
export class AuditEntry {
  private constructor(private readonly props: AuditEntryProps) {}

  static fromPersistence(props: AuditEntryProps): AuditEntry {
    return new AuditEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string | null {
    return this.props.tenantId;
  }

  get actorId(): string | null {
    return this.props.actorId;
  }

  get action(): string {
    return this.props.action;
  }

  get objectType(): string {
    return this.props.objectType;
  }

  get objectId(): string {
    return this.props.objectId;
  }

  get before(): unknown {
    return this.props.before;
  }

  get after(): unknown {
    return this.props.after;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toSnapshot(): Readonly<AuditEntryProps> {
    return { ...this.props };
  }
}
