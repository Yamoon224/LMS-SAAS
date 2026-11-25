"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check, CloudOff, Send, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { submitAttempt } from "../api/assessments.api";
import { useAnswerSaver } from "../hooks/useAnswerSaver";
import type { SaveState } from "../hooks/useAnswerSaver";
import { formatClock, useCountdown } from "../hooks/useCountdown";
import type { Attempt, AttemptQuestion } from "../schemas/assessment.schema";

import { SubmitDialog } from "./SubmitDialog";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { SafeHtml } from "@/features/player/components/SafeHtml";
import { ApiError } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type Answers = Record<string, string[]>;

function SaveIndicator({ state }: { state: SaveState }) {
  const copy = useCopy();
  if (state === "idle") return null;
  const map = {
    saving: { icon: <Spinner className="h-3.5 w-3.5" />, text: copy.quiz.saving, cls: "text-subtle" },
    saved: { icon: <Check className="h-3.5 w-3.5" aria-hidden="true" />, text: copy.quiz.saved, cls: "text-green-700" },
    error: { icon: <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />, text: copy.quiz.saveFailed, cls: "text-red-700" },
  } as const;
  const item = map[state];
  return (
    <p role="status" className={cn("flex items-center gap-1.5 text-xs font-medium", item.cls)}>
      {item.icon}
      {item.text}
    </p>
  );
}

/** Annonces lecteur d'écran à intervalle grossier (10, 5, 2, 1 min, puis < 1 min), jamais chaque seconde. */
function timeAnnouncement(remainingMs: number | null, lastBucket: React.MutableRefObject<number>, copy: Copy): string {
  if (remainingMs === null) return "";
  const minutes = Math.ceil(remainingMs / 60000);
  const bucket = [10, 5, 2, 1].find((b) => minutes <= b) ?? 99;
  if (bucket === 99 || bucket === lastBucket.current) return "";
  lastBucket.current = bucket;
  return remainingMs <= 60000 ? copy.quiz.timeAnnounceLast : copy.quiz.timeAnnounce(minutes);
}

function Clock({ remainingMs }: { remainingMs: number | null }) {
  const copy = useCopy();
  const lastBucket = useRef(99);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const text = timeAnnouncement(remainingMs, lastBucket, copy);
    if (text) setAnnouncement(text);
  }, [remainingMs, copy]);

  if (remainingMs === null) return null;
  const urgent = remainingMs <= 60000;
  return (
    <>
      <p
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums",
          urgent ? "bg-red-100 text-red-800" : "bg-ink/5 text-ink",
        )}
      >
        <Timer className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{copy.quiz.timeLeft} : </span>
        <span aria-hidden="true">{formatClock(remainingMs)}</span>
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

function QuestionCard({
  question,
  selected,
  onChange,
  headingRef,
}: {
  question: AttemptQuestion;
  selected: string[];
  onChange: (ids: string[]) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const copy = useCopy();
  const multiple = question.type === "MULTIPLE_CHOICE";
  const hint = multiple ? copy.quiz.multipleHint : question.type === "TRUE_FALSE" ? copy.quiz.trueFalseHint : copy.quiz.singleHint;

  function toggle(id: string) {
    if (!multiple) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="w-full">
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          {copy.quiz.questionHeading}
        </h2>
        <SafeHtml html={question.statementHtml} className="text-base font-semibold sm:text-lg" />
        <p className="mt-2 text-xs text-subtle">
          {hint} · {copy.quiz.point(question.points)}
        </p>
      </legend>
      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary sm:text-base",
                checked ? "border-primary bg-primary/5 font-medium" : "border-line bg-card hover:bg-canvas",
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={`q-${question.id}`}
                checked={checked}
                onChange={() => toggle(option.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center border-2",
                  multiple ? "rounded-md" : "rounded-full",
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-line",
                )}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function QuestionNav({
  questions,
  answers,
  current,
  onGo,
}: {
  questions: AttemptQuestion[];
  answers: Answers;
  current: number;
  onGo: (index: number) => void;
}) {
  const copy = useCopy();
  return (
    <nav aria-label={copy.quiz.questionNav}>
      <ol className="flex flex-wrap gap-2">
        {questions.map((q, i) => {
          const answered = (answers[q.id]?.length ?? 0) > 0;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onGo(i)}
                aria-label={copy.quiz.goToQuestion(i + 1)}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "flex h-[44px] w-[44px] items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  i === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-line bg-card text-subtle hover:bg-canvas",
                )}
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const ALREADY_DONE_CODES = ["TENTATIVE_DEJA_SOUMISE", "TENTATIVE_EXPIREE"];

/**
 * Exécuteur de tentative : une question par écran, sauvegarde au fil de l'eau,
 * minuteur serveur, soumission manuelle (confirmation) ou automatique à l'expiration.
 */
export function AttemptRunner({ attempt, receivedAt, enrollmentId }: { attempt: Attempt; receivedAt: number; enrollmentId: string }) {
  const copy = useCopy();
  const router = useRouter();
  const search = useSearchParams().toString();
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedOptionIds])),
  );
  const [current, setCurrent] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);
  const saver = useAnswerSaver(attempt.id);

  const total = attempt.questions.length;
  const question = attempt.questions[current];
  const answeredCount = attempt.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length;
  const resultUrl = `/my-learning/${enrollmentId}/attempts/${attempt.id}/result${search ? `?${search}` : ""}`;

  // Focus sur la question à chaque changement d'écran (sauf au premier rendu).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [current]);

  // Avertit avant de quitter avec des réponses non enregistrées.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saver.hasPending()) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saver]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      await saver.flush();
      try {
        await submitAttempt(attempt.id);
        router.replace(resultUrl);
      } catch (error) {
        if (error instanceof ApiError && ((error.code && ALREADY_DONE_CODES.includes(error.code)) || auto)) {
          router.replace(resultUrl);
          return;
        }
        submittingRef.current = false;
        setSubmitting(false);
        toast.error(copy.quiz.submitFailed);
      }
    },
    [attempt.id, resultUrl, router, saver, copy],
  );

  const remainingMs = useCountdown(attempt.deadline, attempt.serverNow, receivedAt, () => {
    toast.error(copy.quiz.timeUp);
    void doSubmit(true);
  });

  function handleChange(ids: string[]) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: ids }));
    saver.queue(question.id, ids);
  }

  if (!question) return <p className="text-sm text-subtle">{copy.quiz.noQuestions}</p>;
  const isLast = current === total - 1;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-28 md:pb-0">
      <header className="sticky top-16 z-20 -mx-4 flex flex-col gap-2 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:bg-card/95 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{copy.quiz.question(current + 1, total)}</p>
          <Clock remainingMs={remainingMs} />
        </div>
        <Progress value={((current + 1) / total) * 100} label={copy.quiz.question(current + 1, total)} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-subtle">{copy.quiz.answered(answeredCount, total)}</p>
          <SaveIndicator state={saver.state} />
        </div>
      </header>

      <div className="rounded-md border border-line bg-card p-4 shadow-card sm:p-6">
        <QuestionCard key={question.id} question={question} selected={answers[question.id] ?? []} onChange={handleChange} headingRef={headingRef} />
      </div>

      <QuestionNav questions={attempt.questions} answers={answers} current={current} onGo={setCurrent} />

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="button" variant="outline" className="flex-1 md:flex-none" disabled={current === 0 || submitting} onClick={() => setCurrent(current - 1)}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          {copy.quiz.previous}
        </Button>
        <span className="hidden flex-1 md:block" />
        {isLast ? (
          <Button type="button" className="flex-1 md:flex-none" disabled={submitting} onClick={() => setConfirmOpen(true)}>
            {submitting ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {submitting ? copy.quiz.submitting : copy.quiz.submit}
          </Button>
        ) : (
          <Button type="button" className="flex-1 md:flex-none" disabled={submitting} onClick={() => setCurrent(current + 1)}>
            {copy.quiz.next}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Button>
        )}
      </div>

      {!isLast && (
        <Button type="button" variant="ghost" size="sm" className="self-center" disabled={submitting} onClick={() => setConfirmOpen(true)}>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {copy.quiz.submit}
        </Button>
      )}

      <SubmitDialog
        open={confirmOpen}
        unanswered={total - answeredCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void doSubmit(false)}
      />
    </div>
  );
}
