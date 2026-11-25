"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useEnrollment } from "../hooks/useEnrollment";
import { useEnrollments } from "../hooks/useEnrollments";
import { learnerLabel } from "../schemas/enrollment.schema";

import { EnrollmentActions } from "./EnrollmentActions";
import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";

function formatPrice(price: number): string {
  return price === 0 ? "Gratuit" : price.toLocaleString("fr-FR");
}

/**
 * Fiche d'une inscription (ENT-60 à ENT-64) : statut, accès, progression, et actions de gestion
 * (déléguées à EnrollmentActions). N'affiche que les actions valides depuis le statut courant
 * (voir enrollment.schema.ts, miroir de enrollment-status.ts côté backend) — même discipline
 * que CourseStatusActions pour les formations.
 */
/** Motif d'un refus (ENT-61) et motif d'une inscription manuelle (ENT-62), quand ils existent. */
function EnrollmentNotes({ enrollment }: { enrollment: { refusalReason?: string | null; manualEnrollmentNote?: string | null } }) {
  return (
    <>
      {enrollment.refusalReason && <Field label="Motif du refus" value={enrollment.refusalReason} />}
      {enrollment.manualEnrollmentNote && <Field label="Inscription manuelle (motif)" value={enrollment.manualEnrollmentNote} />}
    </>
  );
}

export function EnrollmentDetail({ courseId, enrollmentId }: { courseId: string; enrollmentId: string }) {
  const { data: enrollment, isLoading, isError, error } = useEnrollment(enrollmentId);
  // La fiche ne renvoie pas le nom : on le retrouve dans la liste (même requête que la page précédente, souvent en cache).
  const { data: siblings } = useEnrollments(courseId);
  const identity = siblings?.find((item) => item.id === enrollmentId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !enrollment) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <ErrorBanner title={isNotFound ? "Inscription introuvable." : "Impossible de charger cette inscription."} error={isNotFound ? undefined : error} />
    );
  }

  const progressPercent =
    enrollment.progress.totalLessons === 0
      ? 0
      : Math.round((enrollment.progress.completedLessons / enrollment.progress.totalLessons) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/courses/${courseId}/learners`}
          className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux apprenants
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 title={enrollment.userId} className="break-words text-lg font-semibold tracking-tight sm:text-xl">
            {learnerLabel({ ...enrollment, ...(identity ?? {}) })}
          </h1>
          {identity?.learnerName && identity.email && <span className="text-sm text-muted-foreground">{identity.email}</span>}
          <EnrollmentStatusBadge status={enrollment.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscription</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Prix payé" value={formatPrice(enrollment.pricePaid)} />
          <Field
            label="Expiration"
            value={enrollment.expiresAt ? enrollment.expiresAt.toLocaleDateString("fr-FR") : "Illimité"}
          />
          <Field label="Identifiant" value={enrollment.id} mono />
          <EnrollmentNotes enrollment={enrollment} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progression</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {enrollment.progress.completedLessons} / {enrollment.progress.totalLessons} leçons terminées
            ({progressPercent}%)
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/70" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Progression">
            <div className="h-full bg-brand" style={{ width: `${progressPercent}%` }} />
          </div>
        </CardContent>
      </Card>

      <EnrollmentActions courseId={courseId} enrollment={enrollment} />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}
