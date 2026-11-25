"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useLesson } from "../hooks/useLesson";
import { useUpdateLesson } from "../hooks/useUpdateLesson";
import type { CreateLessonValues, LessonDetail } from "../schemas/lesson.schema";
import { lessonFormSchema, lessonToFormValues, toUpdatePayload } from "../schemas/lesson.schema";
import { acceptsUploadedFile } from "../schemas/media.schema";

import { LessonFormFields } from "./LessonFormFields";
import { LessonMediaPanel } from "./LessonMediaPanel";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

function EditForm({ moduleId, lesson, onDone }: { moduleId: string; lesson: LessonDetail; onDone: () => void }) {
  const updateLesson = useUpdateLesson(moduleId);
  const form = useForm<CreateLessonValues>({ resolver: zodResolver(lessonFormSchema), defaultValues: lessonToFormValues(lesson) });
  const downloadAllowed = form.watch("downloadAllowed");

  async function onSubmit(values: CreateLessonValues) {
    await updateLesson.mutateAsync({ lessonId: lesson.id, values: toUpdatePayload(values) });
    onDone();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <LessonFormFields form={form} lockType />
      {acceptsUploadedFile(lesson.resourceType) && (
        <LessonMediaPanel
          moduleId={moduleId}
          lessonId={lesson.id}
          resourceType={lesson.resourceType}
          downloadAllowed={downloadAllowed}
        />
      )}
      {updateLesson.isError && (
        <p className="text-xs text-danger">
          {updateLesson.error instanceof ApiError ? updateLesson.error.message : "Enregistrement impossible."}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}

interface LessonEditDialogProps {
  moduleId: string;
  /** Leçon à modifier ; null = dialogue fermé. */
  lessonId: string | null;
  onClose: () => void;
}

/** Modification d'une leçon (ENT-23 à ENT-25) : contenu riche, critère de consultation, fichier (ENT-24). */
export function LessonEditDialog({ moduleId, lessonId, onClose }: LessonEditDialogProps) {
  const { data: lesson, isLoading, isError, error, refetch } = useLesson(moduleId, lessonId);

  useEffect(() => {
    if (lessonId) void refetch();
  }, [lessonId, refetch]);

  return (
    <Dialog open={lessonId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier la leçon</DialogTitle>
        </DialogHeader>
        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && <p className="text-sm text-danger">{error instanceof Error ? error.message : "Chargement impossible."}</p>}
        {lesson && <EditForm key={lesson.id} moduleId={moduleId} lesson={lesson} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
