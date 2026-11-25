"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, ExternalLink, FileText, Hourglass, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import { recordLessonView } from "../api/player.api";
import { courseContentKey, lessonKey, useCourseContent, useLesson } from "../hooks/usePlayer";
import { flattenLessons, neighbours } from "../lib/outline";
import type { Lesson } from "../schemas/player.schema";

import { LessonActionBar } from "./LessonActionBar";
import { MediaPlayer } from "./MediaPlayer";
import { NotTranslatedNote } from "./NotTranslatedNote";
import { PdfViewer } from "./PdfViewer";
import { SafeHtml } from "./SafeHtml";

import { ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { ApiError, errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";
import { textDirection } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";
import { safeUrl } from "@/lib/url";

function criteriaText(lesson: Lesson, copy: Copy): string | null {
  const c = lesson.completionCriteria;
  if (!c) return null;
  if (c.watchedPercent) return copy.player.criteriaWatch(c.watchedPercent);
  if (c.requiresOpen) return copy.player.criteriaOpen;
  return null;
}

function ResourceBody({
  enrollmentId,
  lesson,
  onOpened,
  onProgress,
  onSourceError,
}: {
  enrollmentId: string;
  lesson: Lesson;
  onOpened: () => void;
  onProgress: (percent: number) => void;
  onSourceError: () => void;
}) {
  const copy = useCopy();
  const url = lesson.resource ? safeUrl(lesson.resource.url) : null;
  const type = lesson.resourceType;
  if (!url) return null;

  if (type === "VIDEO" || type === "AUDIO") {
    return (
      <MediaPlayer
        kind={type}
        src={url}
        title={lesson.title}
        downloadAllowed={lesson.downloadAllowed}
        initialPercent={lesson.progress?.watchedPercent ?? 0}
        positionKey={`${enrollmentId}:${lesson.id}`}
        onProgress={onProgress}
        onSourceError={onSourceError}
      />
    );
  }
  if (type === "IMAGE") {
    return (
      <div className="overflow-hidden rounded-md border border-line bg-card shadow-card">
        {/* URL signée éphémère : pas d'optimiseur d'images. */}
        <Image
          src={url}
          alt={lesson.title}
          width={1200}
          height={800}
          unoptimized
          onLoad={onOpened}
          className="h-auto w-full object-contain"
        />
      </div>
    );
  }

  if (type === "PDF") {
    return <PdfViewer url={url} title={lesson.title} downloadAllowed={lesson.downloadAllowed} onOpened={onOpened} />;
  }

  const isLink = type === "LINK";
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {isLink ? <ExternalLink className="h-6 w-6" aria-hidden="true" /> : <FileText className="h-6 w-6" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lesson.title}</p>
        {isLink && <p className="text-xs text-subtle">{copy.player.openLinkNote}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={onOpened}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {isLink ? copy.player.openLink : copy.player.openDocument}
          </a>
        </Button>
        {!isLink && lesson.downloadAllowed && (
          <Button asChild variant="outline">
            <a href={url} download onClick={onOpened}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.player.download}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function LessonError({ error, onRetry, enrollmentId }: { error: unknown; onRetry: () => void; enrollmentId: string }) {
  const copy = useCopy();
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === "MODULE_VERROUILLE") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <Lock className="h-6 w-6" aria-hidden="true" />
        <p className="font-semibold">{copy.player.lockedModule}</p>
        <p>{copy.player.lockedExplain}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/my-learning/${enrollmentId}/learn`}>{copy.player.lockedGoTo}</Link>
        </Button>
      </div>
    );
  }
  if (code === "MEDIA_NON_PRET") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-md border border-line bg-card p-5 text-sm">
        <Hourglass className="h-6 w-6 text-primary" aria-hidden="true" />
        <p>{copy.player.mediaNotReady}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {copy.common.retry}
        </Button>
      </div>
    );
  }
  return (
    <ErrorState
      title={copy.player.lessonError}
      detail={errorDetail(error)}
      onRetry={onRetry}
    />
  );
}

/** Suivi de consultation : ouverture (texte/lien/document) et progression (média), + URL signée expirée. */
function useLessonTracking(enrollmentId: string, lessonId: string, lesson: Lesson | undefined) {
  const copy = useCopy();
  const queryClient = useQueryClient();
  const openedSent = useRef<string | null>(null);
  const refreshCount = useRef(0);

  const view = useMutation({
    mutationFn: (percent?: number) => recordLessonView(enrollmentId, lessonId, percent),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: courseContentKey(enrollmentId) }),
  });
  const { mutate: sendView } = view;

  const alreadyOpened = lesson?.progress?.opened ?? false;
  const autoOpen = Boolean(lesson && (lesson.resourceType === "TEXT" || lesson.resourceType === "IMAGE") && !lesson.resource);

  // Leçon texte : l'affichage vaut ouverture.
  useEffect(() => {
    if (!lesson || !autoOpen || alreadyOpened || openedSent.current === lesson.id) return;
    openedSent.current = lesson.id;
    sendView(undefined);
  }, [lesson, autoOpen, alreadyOpened, sendView]);

  const markOpened = useCallback(() => {
    if (openedSent.current === lessonId) return;
    openedSent.current = lessonId;
    sendView(undefined);
  }, [lessonId, sendView]);

  const sendProgress = useCallback((percent: number) => sendView(percent), [sendView]);

  /** URL signée expirée : on recharge la leçon (max 3 fois par visite pour éviter une boucle). */
  const refreshSource = useCallback(() => {
    if (refreshCount.current >= 3) {
      toast.error(copy.player.mediaError);
      return;
    }
    refreshCount.current += 1;
    toast.success(copy.player.mediaExpired);
    void queryClient.invalidateQueries({ queryKey: lessonKey(enrollmentId, lessonId) });
  }, [enrollmentId, lessonId, queryClient, copy]);

  return { markOpened, sendProgress, refreshSource };
}

function LessonHeader({ lesson, position, total, completed }: { lesson: Lesson; position: number; total: number; completed: boolean }) {
  const copy = useCopy();
  const criteria = criteriaText(lesson, copy);
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {position >= 0 && <span className="text-xs font-medium text-subtle">{copy.player.lessonOf(position + 1, total)}</span>}
        <Badge variant="neutral">{copy.player.lessonTypes[lesson.resourceType] ?? lesson.resourceType}</Badge>
        <Badge variant={lesson.isMandatory ? "default" : "neutral"}>
          {lesson.isMandatory ? copy.player.mandatory : copy.player.optional}
        </Badge>
        {completed && (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {copy.player.completed}
          </Badge>
        )}
      </div>
      <h1
        id="lesson-title"
        tabIndex={-1}
        lang={lesson.contentLocale || undefined}
        dir={textDirection(lesson.contentLocale)}
        className="text-xl font-bold tracking-tight outline-none sm:text-2xl"
      >
        {lesson.title}
      </h1>
      {lesson.isMandatory && !completed && criteria && <p className="text-sm text-subtle">{criteria}</p>}
    </header>
  );
}

/** Lecteur d'une leçon : contenu assaini, média, suivi de consultation, navigation. */
export function LessonView({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) {
  const copy = useCopy();
  const lessonQuery = useLesson(enrollmentId, lessonId);
  const content = useCourseContent(enrollmentId);
  const lesson = lessonQuery.data;
  const tracking = useLessonTracking(enrollmentId, lessonId, lesson);

  // Focus sur le titre quand on change de leçon (clavier / lecteur d'écran).
  useEffect(() => {
    if (lesson) document.getElementById("lesson-title")?.focus({ preventScroll: true });
  }, [lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lessonQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label={copy.common.loading}>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (lessonQuery.isError || !lesson) {
    return <LessonError error={lessonQuery.error} enrollmentId={enrollmentId} onRetry={() => void lessonQuery.refetch()} />;
  }

  const flat = content.data ? flattenLessons(content.data) : [];
  const position = flat.findIndex((l) => l.id === lessonId);
  const { previous, next } = neighbours(flat, lessonId);
  const hasBody = Boolean(lesson.contentHtml?.trim());

  return (
    <article className="flex flex-col gap-5 pb-24 md:pb-0" aria-labelledby="lesson-title">
      <LessonHeader lesson={lesson} position={position} total={flat.length} completed={flat[position]?.completed ?? false} />
      <NotTranslatedNote enrollmentId={enrollmentId} servedLocale={lesson.contentLocale} />
      <ResourceBody enrollmentId={enrollmentId} lesson={lesson} onOpened={tracking.markOpened} onProgress={tracking.sendProgress} onSourceError={tracking.refreshSource} />
      {hasBody && (
        <div
          lang={lesson.contentLocale || undefined}
          dir={textDirection(lesson.contentLocale)}
          className="rounded-md border border-line bg-card p-4 shadow-card sm:p-6"
        >
          <SafeHtml html={lesson.contentHtml ?? ""} />
        </div>
      )}
      {!hasBody && !lesson.resource && <p className="text-sm text-subtle">{copy.player.noContent}</p>}
      <LessonActionBar enrollmentId={enrollmentId} previous={previous} next={next} />
    </article>
  );
}
