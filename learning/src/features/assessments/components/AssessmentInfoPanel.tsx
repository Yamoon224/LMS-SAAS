"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Clock, HelpCircle, Info, RotateCcw, Target, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { startAttempt } from "../api/assessments.api";
import { assessmentKey, useAssessmentInfo } from "../hooks/useAssessments";
import type { AssessmentInfo, AssessmentTarget } from "../schemas/assessment.schema";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { ApiError, errorDetail } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { useCopy, useLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";
import type { Copy } from "@/lib/i18n/types";

function Rule({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function attemptsLine(info: AssessmentInfo, copy: Copy): string {
  if (info.maxAttempts == null) return copy.quiz.unlimitedAttempts;
  const base = copy.quiz.attempts(info.attemptsUsed, info.maxAttempts);
  const left = info.attemptsRemaining ?? Math.max(0, info.maxAttempts - info.attemptsUsed);
  const extra = info.extraAttemptsGranted ? ` (${copy.quiz.extraAttempts(info.extraAttemptsGranted)})` : "";
  return `${base}${extra} · ${copy.quiz.attemptsLeft(left)}`;
}

function blockedText(info: AssessmentInfo, copy: Copy, locale: Locale): string | null {
  if (info.canStartNow || !info.blockedReason) return null;
  const base = copy.quiz.blocked[info.blockedReason] ?? copy.quiz.blocked.MODULE_LOCKED ?? "";
  if (info.blockedReason === "RETRY_TOO_SOON" && info.nextAttemptAt) {
    return `${base} ${copy.quiz.nextAttemptAt(formatDateTime(info.nextAttemptAt, locale))}`;
  }
  return base;
}

function useStart(enrollmentId: string, target: AssessmentTarget, assessmentId: string | undefined) {
  const copy = useCopy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!assessmentId) return;
    setStarting(true);
    try {
      const attemptId = await startAttempt(enrollmentId, target.kind, assessmentId);
      const marker = target.kind === "quiz" ? `quiz=${encodeURIComponent(target.moduleId)}` : "exam=1";
      router.push(`/my-learning/${enrollmentId}/attempts/${attemptId}?${marker}`);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      toast.error((code && copy.quiz.startErrors[code]) || copy.quiz.startFailed);
      void queryClient.invalidateQueries({ queryKey: assessmentKey(enrollmentId, target) });
      setStarting(false);
    }
  }
  return { starting, start };
}

function startLabel(starting: boolean, resuming: boolean, used: number, copy: Copy): string {
  if (starting) return copy.quiz.starting;
  if (resuming) return copy.quiz.resume;
  return used > 0 ? copy.quiz.retry : copy.quiz.start;
}

function InfoLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const copy = useCopy();
  if (error instanceof ApiError && error.status === 404) {
    return <EmptyState icon={HelpCircle} message={copy.quiz.notFound} />;
  }
  return <ErrorState title={copy.quiz.infoError} detail={errorDetail(error)} onRetry={onRetry} />;
}

/** Fiche d'un quiz de module ou de l'examen final : règles, tentatives, démarrage / reprise. */
export function AssessmentInfoPanel({ enrollmentId, target }: { enrollmentId: string; target: AssessmentTarget }) {
  const copy = useCopy();
  const locale = useLocale();
  const info = useAssessmentInfo(enrollmentId, target);
  const { starting, start } = useStart(enrollmentId, target, info.data?.id);
  const isExam = target.kind === "exam";

  if (info.isLoading) return <Skeleton className="h-72" />;
  if (info.isError || !info.data) return <InfoLoadError error={info.error} onRetry={() => void info.refetch()} />;

  const data = info.data;
  const resuming = Boolean(data.inProgressAttemptId);
  const blocked = resuming ? null : blockedText(data, copy, locale);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <header className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {isExam ? <Trophy className="h-6 w-6" aria-hidden="true" /> : <HelpCircle className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{isExam ? copy.quiz.examTitle : copy.quiz.quizTitle}</h1>
            <p className="text-sm text-subtle">{copy.quiz.rules}</p>
          </div>
        </header>

        <ul className="flex flex-col gap-3 rounded-md bg-canvas p-4">
          <Rule icon={Target}>{copy.quiz.passing(data.passingScorePercent)}</Rule>
          <Rule icon={HelpCircle}>{copy.quiz.questions(data.questionCount)}</Rule>
          <Rule icon={Clock}>{data.timeLimitMinutes ? copy.quiz.timeLimit(data.timeLimitMinutes) : copy.quiz.noTimeLimit}</Rule>
          <Rule icon={RotateCcw}>{attemptsLine(data, copy)}</Rule>
          {data.delayBetweenAttemptsMinutes ? <Rule icon={Clock}>{copy.quiz.delay(data.delayBetweenAttemptsMinutes)}</Rule> : null}
        </ul>

        {blocked && (
          <p role="status" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {blocked}
          </p>
        )}

        <Button type="button" size="lg" disabled={(!data.canStartNow && !resuming) || starting} onClick={() => void start()}>
          {starting && <Spinner />}
          {startLabel(starting, resuming, data.attemptsUsed, copy)}
        </Button>
      </CardContent>
    </Card>
  );
}
