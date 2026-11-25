import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@shared/decorators";
import type { AuthenticatedUser } from "@shared/decorators/current-user.decorator";

import { ListNotificationsUseCase } from "../application/list-notifications.use-case";
import { MarkNotificationReadUseCase } from "../application/mark-notification-read.use-case";

/** Centre de notifications in-app de l'utilisateur connecté, quel que soit son profil. */
@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister mes notifications" })
  async list(@CurrentUser() user: AuthenticatedUser, @Query("unreadOnly") unreadOnly?: string) {
    const notifications = await this.listNotificationsUseCase.execute(user.userId, unreadOnly === "true");
    return notifications.map((notification) => ({
      id: notification.id,
      templateKey: notification.templateKey,
      payload: notification.payload,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    }));
  }

  @Post(":notificationId/read")
  @ApiOperation({ summary: "Marquer une notification comme lue" })
  async markRead(@Param("notificationId") notificationId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.markNotificationReadUseCase.execute(notificationId, user.userId);
    return { notificationId };
  }
}
