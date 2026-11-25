import { notificationSchema } from "../schemas/notification.schema";
import type { AppNotification } from "../schemas/notification.schema";

import { apiClient } from "@/lib/api-client";

export async function fetchNotifications(): Promise<AppNotification[]> {
  const data = await apiClient.get<unknown>("/notifications");
  return notificationSchema.array().parse(data);
}

export function markNotificationRead(notificationId: string): Promise<unknown> {
  return apiClient.post(`/notifications/${encodeURIComponent(notificationId)}/read`);
}
