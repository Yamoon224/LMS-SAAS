import { Injectable } from "@nestjs/common";
import type { Notification as PrismaNotification } from "@prisma/client";
import { PrismaService } from "@shared/prisma/prisma.service";

import { NotificationChannel } from "../domain/notification-channel";
import { NotificationStatus } from "../domain/notification-status";
import { Notification } from "../domain/notification.entity";
import type {
  CreateNotificationData,
  NotificationFilters,
  NotificationRepositoryPort,
} from "../domain/notification.repository.port";

@Injectable()
export class NotificationPrismaRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async listForRecipient(recipientUserId: string, filters?: NotificationFilters): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        recipientUserId,
        status: filters?.status,
        readAt: filters?.unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async create(data: CreateNotificationData): Promise<Notification> {
    const record = await this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        recipientUserId: data.recipientUserId,
        channel: data.channel,
        templateKey: data.templateKey,
        locale: data.locale,
        payload: data.payload as object,
      },
    });
    return this.toDomain(record);
  }

  async save(notification: Notification): Promise<void> {
    const snapshot = notification.toSnapshot();
    await this.prisma.notification.update({
      where: { id: snapshot.id },
      data: {
        status: snapshot.status,
        errorMessage: snapshot.errorMessage,
        sentAt: snapshot.sentAt,
        readAt: snapshot.readAt,
      },
    });
  }

  private toDomain(record: PrismaNotification): Notification {
    return Notification.fromPersistence({
      id: record.id,
      tenantId: record.tenantId,
      recipientUserId: record.recipientUserId,
      channel: record.channel as NotificationChannel,
      templateKey: record.templateKey,
      locale: record.locale,
      payload: record.payload as Record<string, unknown>,
      status: record.status as NotificationStatus,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      sentAt: record.sentAt,
      readAt: record.readAt,
    });
  }
}
