"use client";

import { Award, Bell, CalendarClock } from "lucide-react";
import Link from "next/link";

import { useDashboard } from "../hooks/useDashboard";
import type { Dashboard } from "../schemas/dashboard.schema";

import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCertificate } from "@/features/certificates/hooks/useCertificate";
import { SessionJoinActions } from "@/features/live-sessions/components/SessionJoinActions";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { formatDate, formatDateTime } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";

const RECENT_CERTIFICATES = 3;

function Panel({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InProgress({ items }: { items: Dashboard["inProgress"] }) {
  const copy = useCopy();
  if (items.length === 0) return <p className="text-sm text-subtle">{copy.vitrine.dashboard.noInProgress}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const label = copy.vitrine.dashboard.progressLabel(item.progressPercent);
        return (
          <li key={item.enrollmentId} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium">{item.courseTitle ?? copy.learning.courseUnavailable}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/my-learning/${item.enrollmentId}`}>{copy.vitrine.dashboard.continue}</Link>
              </Button>
            </div>
            <Progress value={item.progressPercent} label={label} />
            <p className="text-xs text-subtle">{label}</p>
          </li>
        );
      })}
    </ul>
  );
}

function Sessions({ items }: { items: Dashboard["upcomingSessions"] }) {
  const copy = useCopy();
  const locale = useLocale();
  if (items.length === 0) return <p className="text-sm text-subtle">{copy.vitrine.dashboard.noSessions}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((session) => (
        <li key={session.id} className="flex flex-col gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
          <div>
            <p className="text-sm font-semibold">{session.title}</p>
            {session.courseTitle && <p className="text-xs text-subtle">{session.courseTitle}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {formatDateTime(session.startAt, locale)} · {copy.live.minutes(session.durationMinutes)}
            </p>
          </div>
          <SessionJoinActions session={session} />
        </li>
      ))}
    </ul>
  );
}

function RecentCertificate({ enrollmentId, title }: { enrollmentId: string; title: string }) {
  const locale = useLocale();
  const certificate = useCertificate(enrollmentId, true);
  if (certificate.isLoading) return <Skeleton className="h-8" />;
  if (!certificate.data) return null;
  return (
    <li className="flex items-center gap-3 text-sm">
      <Award className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      <span className="shrink-0 text-xs text-subtle">{formatDate(certificate.data.issuedAt, locale)}</span>
    </li>
  );
}

function Notifications() {
  const copy = useCopy();
  const { data, isLoading } = useNotifications();
  if (isLoading) return <Skeleton className="h-8" />;
  const unread = (data ?? []).filter((notification) => !notification.readAt);
  if (unread.length === 0) return <p className="text-sm text-subtle">{copy.vitrine.dashboard.noUnread}</p>;
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
      {copy.vitrine.dashboard.unreadCount(unread.length)}
    </p>
  );
}

/** PUB-05 : tableau de bord agrégé (en cours + %, sessions à venir, certificats récents, notifications non lues). */
export function LearnerDashboard() {
  const copy = useCopy();
  const t = copy.vitrine.dashboard;
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="status" aria-label={copy.common.loading}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState title={t.errorTitle} detail={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const recent = data.completed.slice(0, RECENT_CERTIFICATES);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel id="dash-progress" title={t.inProgress}>
        <InProgress items={data.inProgress} />
      </Panel>
      <Panel id="dash-sessions" title={t.upcomingSessions}>
        <Sessions items={data.upcomingSessions} />
      </Panel>
      <Panel
        id="dash-certificates"
        title={t.recentCertificates}
        action={
          <Link href="/certificates" className="flex min-h-[44px] items-center text-xs font-medium text-primary hover:underline">
            {t.seeAll}
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="text-sm text-subtle">{t.noCertificates}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <RecentCertificate key={item.enrollmentId} enrollmentId={item.enrollmentId} title={item.courseTitle ?? copy.learning.courseUnavailable} />
            ))}
          </ul>
        )}
      </Panel>
      <Panel
        id="dash-notifications"
        title={t.unreadNotifications}
        action={
          <Link href="/notifications" className="flex min-h-[44px] items-center text-xs font-medium text-primary hover:underline">
            {t.seeAll}
          </Link>
        }
      >
        <Notifications />
      </Panel>
    </div>
  );
}
