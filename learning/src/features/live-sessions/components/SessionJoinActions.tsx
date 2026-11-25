"use client";

import { CalendarPlus, Video } from "lucide-react";

import { useJoinState } from "../hooks/useJoinState";
import { useRecordLiveSessionJoin } from "../hooks/useLiveSessions";
import { calendarHref } from "../lib/join-window";

import { Button } from "@/components/ui/button";
import { useCopy } from "@/lib/i18n/client";
import { safeUrl } from "@/lib/url";

interface Props {
  session: { id: string; startAt: string; durationMinutes: number; status: string; meetLink?: string | null };
}

/** PUB-13 : « Ajouter à mon agenda » (.ics) et « Rejoindre » (actif de T-15 min jusqu'à la fin de la session). */
export function SessionJoinActions({ session }: Props) {
  const copy = useCopy();
  const join = useRecordLiveSessionJoin();
  const state = useJoinState(session);
  const meet = safeUrl(session.meetLink);
  const upcoming = session.status === "SCHEDULED" || session.status === "IN_PROGRESS";
  if (!upcoming) return null;

  function handleJoin() {
    if (!meet) return;
    // Présence best-effort : n'empêche jamais d'ouvrir la session.
    join.mutate(session.id);
    window.open(meet, "_blank", "noopener,noreferrer");
  }

  const hint =
    state === "later" ? copy.vitrine.live.joinLater : state === "ended" ? copy.vitrine.live.joinEnded : !meet ? copy.vitrine.live.noLink : null;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={calendarHref(session.id)} download>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {copy.vitrine.live.addToCalendar}
          </a>
        </Button>
        <Button type="button" size="sm" disabled={state !== "open" || !meet} onClick={handleJoin}>
          <Video className="h-4 w-4" aria-hidden="true" />
          {copy.live.join}
        </Button>
      </div>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}
