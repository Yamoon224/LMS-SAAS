"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ClipboardCheck, Layers, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useDeleteModule } from "../hooks/useDeleteModule";
import { useModules } from "../hooks/useModules";
import { useReorderModules } from "../hooks/useReorderModules";

import { CreateModuleDialog } from "./CreateModuleDialog";

import { ErrorBanner } from "@/components/feedback/ErrorBanner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { RowActions } from "@/components/ui/row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { LessonList } from "@/features/lessons/components/LessonList";

/**
 * Programme d'une formation : modules (ENT-22) avec leçons imbriquées
 * (ENT-23 à ENT-25), dépliables. Réordonnancement par boutons haut/bas
 * plutôt que glisser-déposer (cf. LessonList — même arbitrage effort/polish).
 */
export function ModuleList({ courseId }: { courseId: string }) {
  const { data: modules, isLoading, isError, error } = useModules(courseId);
  const deleteModule = useDeleteModule(courseId);
  const reorderModules = useReorderModules(courseId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  function moveModule(index: number, direction: -1 | 1) {
    if (!modules) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const ids = modules.map((courseModule) => courseModule.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, moved!);
    reorderModules.mutate(ids);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Programme (modules &amp; leçons)</h2>
        <CreateModuleDialog courseId={courseId} />
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && <ErrorBanner title="Impossible de charger les modules." error={error} />}

      {!isLoading && !isError && modules && modules.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
          <Layers className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun module pour le moment.</p>
        </div>
      )}

      {!isLoading && !isError && modules && modules.length > 0 && (
        <ul className="flex flex-col gap-2">
          {modules.map((courseModule, index) => {
            const isExpanded = expandedId === courseModule.id;
            return (
              <li key={courseModule.id} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : courseModule.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                    <span className="truncate text-sm font-medium">{courseModule.title}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/courses/${courseId}/modules/${courseModule.id}/quiz`}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Quiz
                      </Link>
                    </Button>
                    <RowActions label={`Actions pour le module ${courseModule.title}`}>
                      <DropdownMenuItem disabled={index === 0 || reorderModules.isPending} onSelect={() => moveModule(index, -1)}>
                        <ArrowUp /> Monter
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === modules.length - 1 || reorderModules.isPending}
                        onSelect={() => moveModule(index, 1)}
                      >
                        <ArrowDown /> Descendre
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteTarget({ id: courseModule.id, title: courseModule.title })}>
                        <Trash2 /> Supprimer
                      </DropdownMenuItem>
                    </RowActions>
                  </div>
                </div>

                {isExpanded && <LessonList moduleId={courseModule.id} />}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce module ?"
        description={`« ${deleteTarget?.title ?? ""} » et ses leçons seront supprimés. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        isPending={deleteModule.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteModule.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}
