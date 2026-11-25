"use client";

import { CheckCircle2, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAttempt, useAttemptResult } from "../hooks/useAssessments";
import type { Attempt, AttemptResult } from "../schemas/assessment.schema";

import { ErrorState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeHtml } from "@/features/player/components/SafeHtml";
import { ApiError, errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type ReviewItem = NonNullable<AttemptResult["review"]>[number];

function OptionLine({ label, selected, correct, showCorrect }: { label: string; selected: boolean; correct: boolean; showCorrect: boolean }) {
  const copy = useCopy();
  const tone =
    showCorrect && correct
      ? "border-green-300 bg-green-50"
      : selected && showCorrect && !correct
        ? "border-red-300 bg-red-50"
        : selected
          ? "border-primary/40 bg-primary/5"
          : "border-line bg-card";
  return (
    <li className={cn("flex flex-col gap-1.5 rounded-lg border px-3 py-2 text-sm", tone)}>
      <span className="break-words">{label}</span>
      {(selected || (showCorrect && correct)) && (
        <span className="flex flex-wrap gap-1.5">
          {selected && <Badge variant="neutral">{copy.quiz.yourAnswer}</Badge>}
          {showCorrect && correct && <Badge variant="success">{copy.quiz.correctAnswer}</Badge>}
        </span>
      )}
    </li>
  );
}

function ReviewCard({ index, item, attempt }: { index: number; item: ReviewItem; attempt?: Attempt }) {
  const copy = useCopy();
  const question = attempt?.questions.find((q) => q.id === item.questionId);
  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{copy.quiz.questionHeadingN(index + 1)}</p>
        <Badge variant={item.isCorrect ? "success" : "danger"}>
          {item.isCorrect ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <XCircle className="h-3 w-3" aria-hidden="true" />}
          {item.isCorrect ? copy.quiz.correct : copy.quiz.incorrect}
        </Badge>
      </div>
      {question && <SafeHtml html={question.statementHtml} className="text-sm" />}
      {question && (
        <ul className="flex flex-col gap-1.5">
          {question.options.map((option) => (
            <OptionLine
              key={option.id}
              label={option.label}
              selected={item.selectedOptionIds.includes(option.id)}
              correct={item.correctOptionIds.includes(option.id)}
              showCorrect
            />
          ))}
        </ul>
      )}
      {item.selectedOptionIds.length === 0 && <p className="text-xs text-subtle">{copy.quiz.noAnswer}</p>}
      {item.explanation && (
        <div className="rounded-lg bg-canvas p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle">{copy.quiz.explanation}</p>
          <p>{item.explanation}</p>
        </div>
      )}
    </li>
  );
}

function ScoreRing({ percent, passed }: { percent: number; passed: boolean }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-ink/10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={passed ? "stroke-green-600" : "stroke-red-500"}
        />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums">{Math.round(percent)} %</p>
    </div>
  );
}

function retryHref(enrollmentId: string, kind: string, search: URLSearchParams): string {
  const base = `/my-learning/${enrollmentId}/learn`;
  const moduleId = search.get("quiz");
  if (moduleId) return `${base}/quiz/${moduleId}`;
  if (search.get("exam") || kind.toUpperCase() === "EXAM") return `${base}/exam`;
  return base;
}

function ResultError({
  enrollmentId,
  attemptId,
  error,
  onRetry,
  query,
}: {
  enrollmentId: string;
  attemptId: string;
  error: unknown;
  onRetry: () => void;
  query: string;
}) {
  const copy = useCopy();
  const notSubmitted = error instanceof ApiError && error.code === "TENTATIVE_NON_SOUMISE";
  const detail = notSubmitted ? "" : errorDetail(error);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <ErrorState
        title={notSubmitted ? copy.quiz.inProgressResult : copy.quiz.resultError}
        detail={detail}
        onRetry={notSubmitted ? undefined : onRetry}
      />
      {notSubmitted && (
        <Button asChild>
          <Link href={`/my-learning/${enrollmentId}/attempts/${attemptId}?${query}`}>{copy.quiz.resume}</Link>
        </Button>
      )}
    </div>
  );
}

function ReviewSection({ review, attempt }: { review: ReviewItem[] | null | undefined; attempt?: Attempt }) {
  const copy = useCopy();
  if (!review?.length) return <p className="text-center text-sm text-subtle">{copy.quiz.reviewHidden}</p>;
  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-3">
      <h2 id="review-title" className="text-lg font-semibold">
        {copy.quiz.review}
      </h2>
      <ol className="flex flex-col gap-3">
        {review.map((item, index) => (
          <ReviewCard key={item.questionId} index={index} item={item} attempt={attempt} />
        ))}
      </ol>
    </section>
  );
}

/** Résultat d'une tentative ; correction détaillée seulement si le backend l'envoie (resultsDisplay). */
export function ResultView({ enrollmentId, attemptId }: { enrollmentId: string; attemptId: string }) {
  const copy = useCopy();
  const search = useSearchParams();
  const result = useAttemptResult(attemptId);
  const attempt = useAttempt(attemptId);

  if (result.isLoading) return <Skeleton className="mx-auto h-80 max-w-3xl" />;
  if (result.isError || !result.data) {
    return (
      <ResultError
        enrollmentId={enrollmentId}
        attemptId={attemptId}
        error={result.error}
        onRetry={() => void result.refetch()}
        query={search.toString()}
      />
    );
  }

  const data = result.data;
  const isExam = data.kind.toUpperCase() === "EXAM";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
          <ScoreRing percent={data.scorePercent} passed={data.passed} />
          <div className="flex flex-1 flex-col gap-2">
            <Badge variant={data.passed ? "success" : "danger"} className="self-center sm:self-start">
              {data.passed ? copy.quiz.passed : copy.quiz.failed}
            </Badge>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isExam ? copy.quiz.examTitle : copy.quiz.quizTitle} · {copy.quiz.resultTitle}
            </h1>
            <p className="text-sm text-subtle">{data.passed ? copy.quiz.passedMessage : copy.quiz.failedMessage}</p>
            <p className="text-sm font-medium">{copy.quiz.required(data.passingScorePercent)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="sm:flex-1">
          <Link href={`/my-learning/${enrollmentId}/learn`}>
            <Trophy className="h-4 w-4" aria-hidden="true" />
            {copy.quiz.backToPlayer}
          </Link>
        </Button>
        {!data.passed && (
          <Button asChild variant="outline" className="sm:flex-1">
            <Link href={retryHref(enrollmentId, data.kind, search)}>{copy.quiz.retry}</Link>
          </Button>
        )}
        <Button asChild variant="ghost" className="sm:flex-1">
          <Link href={`/my-learning/${enrollmentId}`}>{copy.quiz.backToCourse}</Link>
        </Button>
      </div>

      <ReviewSection review={data.review} attempt={attempt.data} />
    </div>
  );
}
