"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateLesson } from "../hooks/useCreateLesson";
import type { CreateLessonValues } from "../schemas/lesson.schema";
import { DEFAULT_WATCHED_PERCENT, lessonFormSchema, toCreatePayload } from "../schemas/lesson.schema";
import { acceptsUploadedFile } from "../schemas/media.schema";

import { LessonFormFields } from "./LessonFormFields";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api-client";

const DEFAULT_VALUES: CreateLessonValues = {
  title: "",
  resourceType: "TEXT",
  contentHtml: "",
  storageUrl: "",
  isMandatory: true,
  completionCriteria: { watchedPercent: DEFAULT_WATCHED_PERCENT, requiresOpen: true },
  downloadAllowed: false,
};

interface CreateLessonDialogProps {
  moduleId: string;
  /** Appelé après la création d'une leçon à fichier : l'écran ouvre l'édition pour téléverser le fichier. */
  onCreatedNeedingFile?: (lessonId: string) => void;
}

/**
 * Dialogue d'ajout d'une leçon (ENT-23 à ENT-25). Le fichier d'une leçon vidéo/audio/PDF/image/document se téléverse
 * juste après la création, depuis la fiche d'édition (il est rattaché à une leçon existante).
 */
export function CreateLessonDialog({ moduleId, onCreatedNeedingFile }: CreateLessonDialogProps) {
  const [open, setOpen] = useState(false);
  const createLesson = useCreateLesson(moduleId);
  const form = useForm<CreateLessonValues>({ resolver: zodResolver(lessonFormSchema), defaultValues: DEFAULT_VALUES });
  const { handleSubmit, reset, watch, formState } = form;

  async function onSubmit(values: CreateLessonValues) {
    const created = await createLesson.mutateAsync(toCreatePayload(values));
    const needsFile = acceptsUploadedFile(values.resourceType);
    reset(DEFAULT_VALUES);
    setOpen(false);
    if (needsFile) onCreatedNeedingFile?.(created.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
          Ajouter une leçon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle leçon</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <LessonFormFields form={form} />
          {acceptsUploadedFile(watch("resourceType")) && (
            <p className="text-xs text-muted-foreground">Vous pourrez téléverser le fichier juste après la création de la leçon.</p>
          )}
          {createLesson.isError && (
            <p className="text-xs text-danger">
              {createLesson.error instanceof ApiError ? createLesson.error.message : "Création impossible."}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Spinner />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
