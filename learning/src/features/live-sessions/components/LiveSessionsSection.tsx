"use client";

import { CalendarClock, ExternalLink } from "lucide-react";
import { useState } from "react";

import { useLiveSessions, useRegisterForLiveSession } from "../hooks/useLiveSessions";
import type { LiveSession } from "../schemas/live-session.schema";

import { SessionJoinActions } from "./SessionJoinActions";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { formatDateTime } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import { safeUrl } from "@/lib/url";

function SessionRow({ session }: { session: LiveSession }) {
  const copy = useCopy();
  const locale = useLocale();
  const register = useRegisterForLiveSession();
  const [registered, setRegistered] = useState(false);

  const replay = safeUrl(session.replayUrl);
  const upcoming = session.status === "SCHEDULED" || session.status === "IN_PROGRESS";

  function handleRegister() {
    register.mutate(session.id, {
      onSuccess: () => {
        setRegistered(true);
        toast.success(copy.live.registerSuccess);
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : copy.live.registerFailed),
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge variant={session.status === "IN_PROGRESS" ? "success" : session.status === "CANCELED" ? "danger" : "neutral"}>
            {copy.live.status[session.status] ?? session.status}
          </Badge>
        </div>
        <p className="break-words font-semibold">{session.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {formatDateTime(session.startAt, locale)} · {copy.live.minutes(session.durationMinutes)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {upcoming && (
          <Button type="button" variant="outline" size="sm" disabled={register.isPending || registered} onClick={handleRegister}>
            {register.isPending && <Spinner />}
            {registered ? copy.live.registered : copy.live.register}
          </Button>
        )}
        <SessionJoinActions session={session} />
        {replay && (
          <Button asChild variant="outline" size="sm">
            <a href={replay} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {copy.live.replay}
            </a>
          </Button>
        )}
      </div>
    </li>
  );
}

export function LiveSessionsSection({ courseId, enabled }: { courseId: string; enabled: boolean }) {
  const copy = useCopy();
  const { data, isLoading, isError, error, refetch } = useLiveSessions(courseId, enabled);

  return (
    <section aria-labelledby="live-title" className="flex flex-col gap-3">
      <h2 id="live-title" className="text-lg font-semibold">
        {copy.live.title}
      </h2>
      {isLoading && <Skeleton className="h-24" />}
      {isError && (
        <ErrorState
          title={copy.live.errorTitle}
          detail={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      )}
      {data && data.length === 0 && <EmptyState icon={CalendarClock} message={copy.live.empty} />}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {[...data]
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
            .map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
        </ul>
      )}
    </section>
  );
}
