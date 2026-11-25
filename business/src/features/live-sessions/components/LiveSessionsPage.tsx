"use client";

import { Ban, CalendarPlus, ExternalLink, Link2, Radio, UserCheck } from "lucide-react";
import { useState } from "react";

import { ReplayUrlDialog } from "./ReplayUrlDialog";
import { ScheduleLiveSessionDialog } from "./ScheduleLiveSessionDialog";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";

import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { RowActions } from "@/components/ui/row-actions";
import { CourseSelect } from "@/features/courses/components/CourseSelect";
import { useLiveSessionActions, useLiveSessions } from "@/features/live-sessions/hooks/useLiveSessions";
import { LIVE_SESSION_STATUS_LABELS, sessionIcsHref } from "@/features/live-sessions/schemas/live-session.schema";
import type { LiveSessionItem, LiveSessionStatus } from "@/features/live-sessions/schemas/live-session.schema";
import { formatDateTime } from "@/lib/format";

const STATUS_VARIANTS: Record<LiveSessionStatus, BadgeProps["variant"]> = {
  SCHEDULED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELED: "danger",
};

function CourseSessions({ courseId }: { courseId: string }) {
  const { data: sessions, isLoading, isError, error, refetch } = useLiveSessions(courseId);
  const { schedule, cancel, setReplay } = useLiveSessionActions(courseId);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; title: string } | null>(null);
  const [replayTargetId, setReplayTargetId] = useState<string | null>(null);
  const [attendanceTarget, setAttendanceTarget] = useState<{ id: string; title: string } | null>(null);

  const replayTarget = sessions?.find((session) => session.id === replayTargetId) ?? null;

  type Session = LiveSessionItem;

  function renderLinks(session: Session) {
    if (!session.meetLink && !session.replayUrl) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex flex-col gap-1 text-xs">
        {session.meetLink && (
          <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Google Meet
          </a>
        )}
        {session.replayUrl && (
          <a href={session.replayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Replay
          </a>
        )}
      </div>
    );
  }

  function renderActions(session: Session) {
    const canCancel = session.status === "SCHEDULED";
    const canReplay = session.status !== "CANCELED";
    if (!canCancel && !canReplay) return null;
    return (
      <RowActions label={`Actions pour ${session.title}`}>
        {canReplay && (
          <DropdownMenuItem onSelect={() => setAttendanceTarget({ id: session.id, title: session.title })}>
            <UserCheck /> Pointer la présence
          </DropdownMenuItem>
        )}
        {canReplay && (
          <DropdownMenuItem asChild>
            <a href={sessionIcsHref(session.id)} download>
              <CalendarPlus /> Ajouter à l&apos;agenda (.ics)
            </a>
          </DropdownMenuItem>
        )}
        {canReplay && (
          <DropdownMenuItem onSelect={() => setReplayTargetId(session.id)}>
            <Link2 /> {session.replayUrl ? "Modifier le replay" : "Ajouter le replay"}
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem destructive onSelect={() => setCancelTarget({ id: session.id, title: session.title })}>
            <Ban /> Annuler la session
          </DropdownMenuItem>
        )}
      </RowActions>
    );
  }

  const columns: DataTableColumn<Session>[] = [
    {
      id: "title",
      header: "Session",
      accessor: (session) => session.title,
      cell: (session) => <span className="font-medium">{session.title}</span>,
      hideable: false,
      mobile: "primary",
    },
    {
      id: "startAt",
      header: "Début",
      accessor: (session) => session.startAt,
      cell: (session) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(session.startAt)}</span>,
    },
    {
      id: "duration",
      header: "Durée",
      accessor: (session) => session.durationMinutes,
      exportValue: (session) => session.durationMinutes,
      cell: (session) => <span className="whitespace-nowrap text-muted-foreground">{session.durationMinutes} min</span>,
    },
    {
      id: "status",
      header: "Statut",
      accessor: (session) => LIVE_SESSION_STATUS_LABELS[session.status],
      cell: (session) => <Badge variant={STATUS_VARIANTS[session.status]}>{LIVE_SESSION_STATUS_LABELS[session.status]}</Badge>,
    },
    {
      id: "links",
      header: "Liens",
      accessor: (session) => [session.meetLink, session.replayUrl].filter(Boolean).join(" "),
      exportValue: (session) =>
        [session.meetLink && `Meet : ${session.meetLink}`, session.replayUrl && `Replay : ${session.replayUrl}`]
          .filter(Boolean)
          .join(" | ") || null,
      sortable: false,
      cell: renderLinks,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        data={sessions}
        columns={columns}
        getRowId={(session) => session.id}
        isLoading={isLoading}
        error={isError ? error : undefined}
        onRetry={() => void refetch()}
        title="sessions-live"
        stateKey="live-sessions"
        searchPlaceholder="Rechercher une session…"
        initialSort={{ columnId: "startAt", direction: "desc" }}
        rowActions={(session) => renderActions(session)}
        toolbarActions={
          <ScheduleLiveSessionDialog courseId={courseId} onSchedule={(values) => schedule.mutateAsync(values)} />
        }
        emptyState={<EmptyState icon={Radio} message="Aucune session live pour cette formation." />}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Annuler cette session ?"
        description={`« ${cancelTarget?.title ?? ""} » sera annulée pour tous les inscrits.`}
        confirmLabel="Annuler la session"
        isPending={cancel.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancel.mutate(cancelTarget.id, { onSettled: () => setCancelTarget(null) });
        }}
      />

      <SessionAttendanceDialog
        liveSessionId={attendanceTarget?.id ?? null}
        title={attendanceTarget?.title ?? ""}
        onClose={() => setAttendanceTarget(null)}
      />

      {replayTarget && (
        <ReplayUrlDialog
          key={replayTarget.id}
          open
          onOpenChange={(open) => !open && setReplayTargetId(null)}
          initialUrl={replayTarget.replayUrl}
          onSave={(values) => setReplay.mutateAsync({ liveSessionId: replayTarget.id, values })}
        />
      )}
    </div>
  );
}

/** Sessions live (ENT-52 à ENT-58): planifier, lister par formation, annuler, déposer le replay. */
export function LiveSessionsPage() {
  const [courseId, setCourseId] = useState("");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Sessions live"
        description="Planifiez des sessions Google Meet pour vos formations."
      />

      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="live-course">Formation</Label>
        <CourseSelect id="live-course" value={courseId} onChange={setCourseId} />
      </div>

      {courseId ? (
        <CourseSessions key={courseId} courseId={courseId} />
      ) : (
        <EmptyState icon={Radio} message="Choisissez une formation pour voir et planifier ses sessions live." />
      )}
    </div>
  );
}
