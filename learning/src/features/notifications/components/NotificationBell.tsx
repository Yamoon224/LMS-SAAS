"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

import { useNotifications } from "../hooks/useNotifications";

import { useCopy } from "@/lib/i18n/client";

/** Cloche du header : badge de notifications non lues (rafraîchi toutes les minutes). */
export function NotificationBell() {
  const copy = useCopy();
  const { data } = useNotifications({ poll: true });
  const unread = data?.filter((n) => n.readAt === null).length ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={copy.notifications.unreadCount(unread)}
      className="relative flex h-[44px] w-[44px] items-center justify-center rounded-lg text-ink hover:bg-ink/5"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute end-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
