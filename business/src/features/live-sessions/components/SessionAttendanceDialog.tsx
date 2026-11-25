"use client";

import { Check, X } from "lucide-react";

import { useMarkAttendance, useSessionAttendance } from "../hooks/useLiveSessions";
import { ATTENDEE_STATUS_LABELS } from "../schemas/live-session.schema";
import type { AttendeeStatus } from "../schemas/live-session.schema";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MobileCard, MobileCardList } from "@/components/ui/mobile-card-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_VARIANTS: Record<AttendeeStatus, BadgeProps["variant"]> = {
  PRESENT: "success",
  ABSENT: "danger",
  PENDING: "info",
};

/** Pointage manuel de présence (ENT-57) : marquer présent / absent chaque inscrit à la session. */
export function SessionAttendanceDialog({
  liveSessionId,
  title,
  onClose,
}: {
  liveSessionId: string | null;
  title: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error, refetch } = useSessionAttendance(liveSessionId);
  const mark = useMarkAttendance(liveSessionId);

  function actions(userId: string, status: AttendeeStatus) {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={mark.isPending || status === "PRESENT"} onClick={() => mark.mutate({ userId, present: true })}>
          <Check className="h-4 w-4" aria-hidden="true" /> Présent
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={mark.isPending || status === "ABSENT"} onClick={() => mark.mutate({ userId, present: false })}>
          <X className="h-4 w-4" aria-hidden="true" /> Absent
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={liveSessionId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Présence — {title}</DialogTitle>
          <DialogDescription>
            Le pointage manuel prime sur le suivi automatique de connexion et reste tracé dans le journal d&apos;activité.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error instanceof Error ? error.message : "Impossible de charger les inscrits."}{" "}
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              Réessayer
            </Button>
          </div>
        )}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Aucun inscrit à cette session pour le moment.</p>}

        {data && data.length > 0 && (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Apprenant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Pointage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((attendee) => (
                    <TableRow key={attendee.userId}>
                      <TableCell className="font-medium">{attendee.learnerName ?? attendee.email ?? attendee.userId}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[attendee.status]}>{ATTENDEE_STATUS_LABELS[attendee.status]}</Badge>
                        {attendee.markedManually && <span className="ml-2 text-xs text-muted-foreground">manuel</span>}
                      </TableCell>
                      <TableCell>{actions(attendee.userId, attendee.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <MobileCardList className="md:hidden">
              {data.map((attendee) => (
                <MobileCard
                  key={attendee.userId}
                  title={attendee.learnerName ?? attendee.email ?? attendee.userId}
                  status={<Badge variant={STATUS_VARIANTS[attendee.status]}>{ATTENDEE_STATUS_LABELS[attendee.status]}</Badge>}
                  actions={undefined}
                  fields={[{ label: "Pointage", value: actions(attendee.userId, attendee.status) }]}
                />
              ))}
            </MobileCardList>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
