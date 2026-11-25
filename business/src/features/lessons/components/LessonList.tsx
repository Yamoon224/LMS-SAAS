"use client";

import { ArrowDown, ArrowUp, FileText, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CreateLessonDialog } from "./CreateLessonDialog";
import { LessonEditDialog } from "./LessonEditDialog";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteLesson } from "@/features/lessons/hooks/useDeleteLesson";
import { useLessons } from "@/features/lessons/hooks/useLessons";
import { useReorderLessons } from "@/features/lessons/hooks/useReorderLessons";
import { RESOURCE_TYPE_LABELS } from "@/features/lessons/schemas/lesson.schema";

/**
 * Liste des leçons d'un module (ENT-23 à ENT-25), avec réordonnancement par
 * boutons haut/bas plutôt que glisser-déposer : effort disproportionné pour
 * un premier pas d'après la consigne de cette passe, un champ d'ordre
 * numérique (ici piloté par deux boutons) suffit.
 */
export function LessonList({ moduleId }: { moduleId: string }) {
  const { data: lessons, isLoading, isError, error } = useLessons(moduleId);
  const deleteLesson = useDeleteLesson(moduleId);
  const reorderLessons = useReorderLessons(moduleId);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  function moveLesson(index: number, direction: -1 | 1) {
    if (!lessons) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const ids = lessons.map((lesson) => lesson.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved!);
    reorderLessons.mutate(ids);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface-muted/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Leçons</h4>
        <CreateLessonDialog moduleId={moduleId} onCreatedNeedingFile={setEditLessonId} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {isError && <ErrorBanner title="Impossible de charger les leçons." error={error} />}

      {!isLoading && !isError && lessons && lessons.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Aucune leçon dans ce module pour le moment.
        </p>
      )}

      {!isLoading && !isError && lessons && lessons.length > 0 && (
        <ul className="flex flex-col gap-2">
          {lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-1"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1">
                <span className="shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                <span className="truncate text-sm font-medium">{lesson.title}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  {RESOURCE_TYPE_LABELS[lesson.resourceType]}
                </span>
                {lesson.isMandatory && (
                  <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] uppercase text-warning">
                    Obligatoire
                  </span>
                )}
              </div>
              <RowActions label={`Actions pour la leçon ${lesson.title}`}>
                <DropdownMenuItem onSelect={() => setEditLessonId(lesson.id)}>
                  <Pencil /> Modifier
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === 0 || reorderLessons.isPending} onSelect={() => moveLesson(index, -1)}>
                  <ArrowUp /> Monter
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === lessons.length - 1 || reorderLessons.isPending}
                  onSelect={() => moveLesson(index, 1)}
                >
                  <ArrowDown /> Descendre
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setDeleteTarget({ id: lesson.id, title: lesson.title })}>
                  <Trash2 /> Supprimer
                </DropdownMenuItem>
              </RowActions>
            </li>
          ))}
        </ul>
      )}

      <LessonEditDialog moduleId={moduleId} lessonId={editLessonId} onClose={() => setEditLessonId(null)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette leçon ?"
        description={`« ${deleteTarget?.title ?? ""} » sera supprimée. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isPending={deleteLesson.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteLesson.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
