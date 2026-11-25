"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";

import { useMarkNotificationRead, useNotifications } from "../hooks/useNotifications";
import type { AppNotification } from "../schemas/notification.schema";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { formatRelative } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

function messageFor(copy: Copy, notification: AppNotification): string {
  const render = copy.notifications.templates[notification.templateKey];
  return render ? render(notification.payload ?? {}) : copy.notifications.generic;
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  const copy = useCopy();
  const locale = useLocale();
  const markRead = useMarkNotificationRead();
  const unread = notification.readAt === null;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border bg-card p-4 shadow-card",
        unread ? "border-primary/30" : "border-line",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-2 h-2.5 w-2.5 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("break-words text-sm", unread ? "font-semibold text-ink" : "text-subtle")}>{messageFor(copy, notification)}</p>
        <p className="mt-1 text-xs text-subtle">{formatRelative(notification.createdAt, locale)}</p>
      </div>
      {unread && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={copy.notifications.markRead}
          title={copy.notifications.markRead}
          disabled={markRead.isPending}
          onClick={() =>
            markRead.mutate(notification.id, { onError: () => toast.error(copy.errors.generic) })
          }
        >
          <Check className="h-5 w-5" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}

export function NotificationsPage() {
  const copy = useCopy();
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorState
        title={copy.notifications.errorTitle}
        detail={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }

  const items = [...(data ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((n) => !unreadOnly || n.readAt === null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2" role="group" aria-label={copy.notifications.title}>
        {[
          { label: copy.notifications.all, value: false },
          { label: copy.notifications.unreadOnly, value: true },
        ].map((tab) => (
          <Button
            key={tab.label}
            type="button"
            size="sm"
            variant={unreadOnly === tab.value ? "default" : "outline"}
            aria-pressed={unreadOnly === tab.value}
            onClick={() => setUnreadOnly(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Bell} message={copy.notifications.empty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </div>
  );
}
