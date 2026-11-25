"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchNotifications, markNotificationRead } from "../api/notifications.api";

export const notificationsKey = ["notifications"] as const;

/** `poll` : rafraîchit toutes les 60 s (cloche du header) sans surcharger la page liste. */
export function useNotifications(options?: { poll?: boolean }) {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: fetchNotifications,
    refetchInterval: options?.poll ? 60_000 : false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}
