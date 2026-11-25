import type { NotificationChannel } from "./notification-channel";
import type { Notification } from "./notification.entity";

export interface CreateNotificationData {
  tenantId: string | null;
  recipientUserId: string;
  channel: NotificationChannel;
  templateKey: string;
  locale: string;
  payload: Record<string, unknown>;
}

export interface NotificationFilters {
  status?: "PENDING" | "SENT" | "FAILED";
  unreadOnly?: boolean;
}

/** Port (abstraction) que l'infrastructure (Prisma) doit implémenter. */
export interface NotificationRepositoryPort {
  findById(id: string): Promise<Notification | null>;
  listForRecipient(recipientUserId: string, filters?: NotificationFilters): Promise<Notification[]>;
  create(data: CreateNotificationData): Promise<Notification>;
  save(notification: Notification): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");
