import type { NotificationChannel } from "./notification-channel";
import { NotificationStatus } from "./notification-status";

export interface NotificationProps {
  id: string;
  tenantId: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
}

/**
 * Entité pure du domaine Notification : aucune dépendance à NestJS, à l'ORM
 * ni à un fournisseur d'envoi (section 13.2).
 */
export class Notification {
  private constructor(private props: NotificationProps) {}

  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props);
  }

  get id(): string {
    return this.props.id;
  }

  get recipientUserId(): string {
    return this.props.recipientUserId;
  }

  get channel(): NotificationChannel {
    return this.props.channel;
  }

  get templateKey(): string {
    return this.props.templateKey;
  }

  get locale(): string {
    return this.props.locale;
  }

  get payload(): Readonly<Record<string, unknown>> {
    return this.props.payload;
  }

  get status(): NotificationStatus {
    return this.props.status;
  }

  get readAt(): Date | null {
    return this.props.readAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  markSent(): void {
    this.props.status = NotificationStatus.SENT;
    this.props.sentAt = new Date();
  }

  markFailed(errorMessage: string): void {
    this.props.status = NotificationStatus.FAILED;
    this.props.errorMessage = errorMessage;
  }

  /** ENT: une notification in-app est marquée lue par son destinataire, jamais par un tiers. */
  markRead(): void {
    this.props.readAt ??= new Date();
  }

  toSnapshot(): Readonly<NotificationProps> {
    return { ...this.props };
  }
}
