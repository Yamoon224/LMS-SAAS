"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useChangeCourseStatus } from "../hooks/useChangeCourseStatus";
import { useDuplicateCourse } from "../hooks/useDuplicateCourse";
import { ALLOWED_COURSE_STATUS_TRANSITIONS } from "../schemas/course.schema";
import type { CourseStatus } from "../schemas/course.schema";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";

/**
 * Actions de changement de statut (ENT-18) et duplication (ENT-20).
 * N'affiche que les transitions réellement permises depuis le statut courant
 * (voir ALLOWED_COURSE_STATUS_TRANSITIONS, miroir de course-status.ts côté
 * backend). L'archivage (terminal) passe par une confirmation. Les erreurs
 * sont notifiées par toast (MutationCache).
 */
export function CourseStatusActions({ courseId, status }: { courseId: string; status: CourseStatus }) {
  const router = useRouter();
  const { publish, hide, archive } = useChangeCourseStatus(courseId);
  const duplicateCourse = useDuplicateCourse();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const allowedTargets = ALLOWED_COURSE_STATUS_TRANSITIONS[status];
  const isBusy = publish.isPending || hide.isPending || archive.isPending || duplicateCourse.isPending;

  async function onDuplicate() {
    const result = await duplicateCourse.mutateAsync(courseId);
    router.push(`/courses/${result.id}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowedTargets.includes("PUBLISHED") && (
        <Button size="sm" disabled={isBusy} onClick={() => publish.mutate()}>
          {publish.isPending && <Spinner />}
          Publier
        </Button>
      )}
      {allowedTargets.includes("HIDDEN") && (
        <Button size="sm" variant="outline" disabled={isBusy} onClick={() => hide.mutate()}>
          {hide.isPending && <Spinner />}
          Masquer
        </Button>
      )}
      <Button size="sm" variant="outline" disabled={isBusy} onClick={() => void onDuplicate().catch(() => undefined)}>
        {duplicateCourse.isPending && <Spinner />}
        Dupliquer
      </Button>
      {allowedTargets.includes("ARCHIVED") && (
        <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => setConfirmArchive(true)}>
          Archiver
        </Button>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archiver cette formation ?"
        description="L’archivage est définitif : la formation ne pourra plus être publiée ni modifiée."
        confirmLabel="Archiver"
        isPending={archive.isPending}
        onConfirm={() => archive.mutate(undefined, { onSettled: () => setConfirmArchive(false) })}
      />
    </div>
  );
}
