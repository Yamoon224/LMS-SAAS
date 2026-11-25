"use client";

import { ArrowLeft, ListTree, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCourseContent } from "../hooks/usePlayer";
import { flattenLessons } from "../lib/outline";

import { ContentLanguageSwitcher } from "./ContentLanguageSwitcher";
import { OutlineNav } from "./OutlineNav";

import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEnrollments } from "@/features/enrollments/hooks/useEnrollments";
import { isAccessGranting } from "@/features/enrollments/schemas/enrollment.schema";
import { errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";

/** Fenêtre latérale (mobile) basée sur <dialog> natif : focus piégé, Échap, retour du focus. */
function OutlineSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const copy = useCopy();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clic sur le fond = fermer (confort souris) ; au clavier : Échap natif et bouton de fermeture.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={copy.player.outline}
      className="m-0 ms-auto h-full max-h-none w-[min(22rem,92vw)] max-w-none bg-card p-0 shadow-lift backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <p className="text-base font-semibold">{copy.player.outline}</p>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={copy.player.closeOutline}>
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </dialog>
  );
}

/**
 * Coque du lecteur : barre de progression, sommaire persistant (colonne sur
 * desktop, feuille latérale sur mobile) et zone de contenu. Le sommaire reste
 * monté d'une leçon à l'autre (layout), donc pas de rechargement.
 */
export function PlayerShell({ enrollmentId, children }: { enrollmentId: string; children: React.ReactNode }) {
  const copy = useCopy();
  const pathname = usePathname();
  const content = useCourseContent(enrollmentId);
  const enrollments = useMyEnrollments();
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setSheetOpen(false), [pathname]);
  const enrollment = enrollments.data?.find((e) => e.id === enrollmentId);

  if (content.isLoading || enrollments.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]" role="status" aria-label={copy.common.loading}>
        <Skeleton className="hidden h-96 lg:block" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (enrollment && !isAccessGranting(enrollment.status)) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState title={copy.player.noAccess} detail={copy.statusHelp[enrollment.status]} />
        <Link href={`/my-learning/${enrollmentId}`} className="flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {copy.player.backToCourse}
        </Link>
      </div>
    );
  }
  if (content.isError || !content.data) {
    return <ErrorState title={copy.player.outlineError} detail={errorDetail(content.error)} onRetry={() => void content.refetch()} />;
  }

  const lessons = flattenLessons(content.data);
  const done = lessons.filter((lesson) => lesson.completed).length;
  const label = copy.player.progress(done, lessons.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-3 shadow-card sm:flex-row sm:items-center sm:gap-5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:min-w-0 sm:flex-1 sm:flex-nowrap">
          <Link
            href={`/my-learning/${enrollmentId}`}
            aria-label={copy.player.backToCourse}
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-subtle hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <p className="min-w-[8rem] flex-1 truncate text-sm font-semibold sm:text-base">{enrollment?.courseTitle ?? copy.learning.title}</p>
          <ContentLanguageSwitcher enrollmentId={enrollmentId} />
          <Button type="button" variant="outline" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
            <ListTree className="h-4 w-4" aria-hidden="true" />
            {copy.player.outline}
          </Button>
        </div>
        <div className="flex flex-col gap-1 sm:w-64">
          <Progress value={lessons.length ? (done / lessons.length) * 100 : 0} label={label} />
          <p className="text-xs text-subtle">{label}</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-md border border-line bg-card p-3 shadow-card lg:block">
          <OutlineNav enrollmentId={enrollmentId} content={content.data} pathname={pathname} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      <OutlineSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <OutlineNav enrollmentId={enrollmentId} content={content.data} pathname={pathname} />
      </OutlineSheet>
    </div>
  );
}
