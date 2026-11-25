"use client";

import { CheckCircle2, ClipboardCheck, Lock, PlayCircle, Trophy, Unlock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCourse, useExamAccess, useModulesAccess, useMyEnrollments } from "../hooks/useEnrollments";
import { isAccessGranting } from "../schemas/enrollment.schema";
import type { Enrollment } from "../schemas/enrollment.schema";

import { EnrollmentStatusBadge } from "./EnrollmentStatusBadge";

import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toaster";
import { CertificateCard } from "@/features/certificates/components/CertificateCard";
import { useCertificate } from "@/features/certificates/hooks/useCertificate";
import { LiveSessionsSection } from "@/features/live-sessions/components/LiveSessionsSection";
import { PaymentPanel } from "@/features/payments/components/PaymentPanel";
import { usePaymentMethods } from "@/features/payments/hooks/usePayments";
import { RefundRequestSection } from "@/features/refunds/components/RefundRequestSection";
import { useCopy } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const POLL_EVERY_MS = 5000;
const POLL_FOR_MS = 120_000;

function ModulesSection({ enrollment }: { enrollment: Enrollment }) {
  const copy = useCopy();
  const modules = useModulesAccess(enrollment.id, enrollment.courseId, true);
  const exam = useExamAccess(enrollment.id, enrollment.courseId, true);

  if (modules.isLoading) return <Skeleton className="h-32" />;
  if (modules.isError) {
    return <ErrorState title={copy.errors.loadFailed} onRetry={() => void modules.refetch()} />;
  }

  const list = [...(modules.data ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const validated = list.filter((m) => m.validated).length;
  const label = copy.learning.modulesProgress(validated, list.length);

  return (
    <section aria-labelledby="modules-title" className="flex flex-col gap-4">
      <h2 id="modules-title" className="text-lg font-semibold">
        {copy.learning.modulesTitle}
      </h2>
      {list.length > 0 && (
        <div className="flex flex-col gap-2">
          <Progress value={(validated / list.length) * 100} label={label} />
          <p className="text-sm text-subtle">{label}</p>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {list.map((mod, index) => {
          const state = mod.validated ? "validated" : mod.accessible ? "open" : "locked";
          const Icon = state === "validated" ? CheckCircle2 : state === "open" ? Unlock : Lock;
          return (
            <li
              key={mod.moduleId}
              className={cn(
                "flex items-center gap-3 rounded-md border border-line bg-card p-3",
                state === "locked" && "opacity-70",
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", state === "validated" ? "text-green-600" : state === "open" ? "text-primary" : "text-subtle")}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {copy.learning.moduleLabel(index + 1)}
                  {mod.title ? ` · ${mod.title}` : ""}
                </p>
                <p className="text-xs text-subtle">
                  {state === "validated"
                    ? copy.learning.modulesValidated
                    : state === "open"
                      ? copy.learning.modulesOpen
                      : copy.learning.modulesLocked}
                </p>
              </div>
              {state !== "locked" && (
                <Link
                  href={`/my-learning/${enrollment.id}/learn/quiz/${mod.moduleId}`}
                  className="flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  {copy.player.quizOfModule}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      {exam.data !== undefined && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{copy.learning.examTitle}</p>
            <p className="mt-1 text-sm text-subtle">{exam.data ? copy.learning.examOpen : copy.learning.examLocked}</p>
          </div>
          <Button asChild size="sm" variant={exam.data ? "default" : "outline"}>
            <Link href={`/my-learning/${enrollment.id}/learn/exam`}>
              <Trophy className="h-4 w-4" aria-hidden="true" />
              {copy.quiz.examTitle}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function CertificateSection({ enrollment, courseTitle }: { enrollment: Enrollment; courseTitle?: string }) {
  const copy = useCopy();
  const certificate = useCertificate(enrollment.id, true);
  if (!certificate.data) return null;
  return (
    <section aria-labelledby="cert-title" className="flex flex-col gap-3">
      <h2 id="cert-title" className="text-lg font-semibold">
        {copy.certificates.title}
      </h2>
      <ul>
        <CertificateCard certificate={certificate.data} courseTitle={courseTitle} />
      </ul>
    </section>
  );
}

/** Paiement en ligne d'une inscription en attente + confirmation par sondage doux après retour du PSP. */
function PaymentSection({
  enrollment,
  watching,
  timedOut,
  onAsyncStarted,
  onCheck,
}: {
  enrollment: Enrollment;
  watching: boolean;
  timedOut: boolean;
  onAsyncStarted: () => void;
  onCheck: () => void;
}) {
  const copy = useCopy();
  const methods = usePaymentMethods();
  return (
    <section aria-labelledby="pay-title" className="flex flex-col gap-4 rounded-md border border-line bg-card p-4 shadow-card sm:p-6">
      <h2 id="pay-title" className="text-lg font-semibold">
        {copy.payment.payTitle}
      </h2>
      {watching && !timedOut && (
        <div role="status" className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <Spinner className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{copy.payment.confirming}</p>
            <p className="mt-0.5 text-subtle">{copy.payment.confirmingHelp}</p>
          </div>
        </div>
      )}
      {timedOut && (
        <div role="status" className="flex flex-col items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{copy.payment.stillPending}</p>
          <Button type="button" size="sm" variant="outline" onClick={onCheck}>
            {copy.payment.checkAgain}
          </Button>
        </div>
      )}
      {methods.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <PaymentPanel enrollmentId={enrollment.id} methods={methods.data ?? []} onAsyncStarted={onAsyncStarted} />
      )}
    </section>
  );
}

/** Surveille le statut après retour de paiement : toutes les 5 s pendant 2 min, puis arrêt. */
function usePaymentWatch(enrollmentId: string) {
  const copy = useCopy();
  const returned = useSearchParams().get("payment") === "return";
  const [watching, setWatching] = useState(returned);
  const [timedOut, setTimedOut] = useState(false);
  const deadline = useRef(returned ? Date.now() + POLL_FOR_MS : 0);
  const wasPending = useRef(false);

  const enrollments = useMyEnrollments(true, (list) => {
    const status = list?.find((e) => e.id === enrollmentId)?.status;
    return watching && status === "PENDING_PAYMENT" && Date.now() < deadline.current ? POLL_EVERY_MS : false;
  });
  const enrollment = enrollments.data?.find((e) => e.id === enrollmentId);
  const status = enrollment?.status;

  useEffect(() => {
    if (status === "PENDING_PAYMENT") wasPending.current = true;
    if (status === "ACTIVE" && wasPending.current && watching) {
      wasPending.current = false;
      setWatching(false);
      toast.success(copy.payment.confirmed);
    }
  }, [status, watching, copy]);

  useEffect(() => {
    if (!watching || status !== "PENDING_PAYMENT") return;
    const id = setTimeout(() => setTimedOut(true), Math.max(0, deadline.current - Date.now()));
    return () => clearTimeout(id);
  }, [watching, status]);

  function start() {
    deadline.current = Date.now() + POLL_FOR_MS;
    setTimedOut(false);
    setWatching(true);
    void enrollments.refetch();
  }
  return { enrollments, enrollment, watching, timedOut, start };
}

function hubTitle(copy: Copy, enrollment: Enrollment, fetched: string | undefined): string {
  return enrollment.courseTitle ?? fetched ?? copy.learning.courseUnavailable;
}

function HubNotFound() {
  const copy = useCopy();
  return (
    <div className="flex flex-col gap-4">
      <ErrorState title={copy.learning.hubNotFound} />
      <Link href="/my-learning" className="flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">
        <span className="rtl:rotate-180 inline-block">←</span> {copy.nav.myLearning}
      </Link>
    </div>
  );
}

export function EnrollmentHub({ enrollmentId }: { enrollmentId: string }) {
  const copy = useCopy();
  const { enrollments, enrollment, watching, timedOut, start } = usePaymentWatch(enrollmentId);
  const course = useCourse(enrollment?.courseId ?? "");

  if (enrollments.isLoading) return <Skeleton className="h-48" />;
  if (enrollments.isError) {
    return <ErrorState title={copy.learning.errorTitle} onRetry={() => void enrollments.refetch()} />;
  }
  if (!enrollment) return <HubNotFound />;

  const granted = isAccessGranting(enrollment.status);
  const showCertificate = enrollment.status === "COMPLETED" || enrollment.status === "EXPIRED";
  const title = hubTitle(copy, enrollment, course.data?.title);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link href="/my-learning" className="flex min-h-[44px] items-center self-start text-sm font-medium text-subtle hover:text-ink">
          <span className="inline-block rtl:rotate-180">←</span> {copy.nav.myLearning}
        </Link>
        <EnrollmentStatusBadge status={enrollment.status} />
        <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="max-w-2xl text-sm text-subtle sm:text-base">{copy.statusHelp[enrollment.status]}</p>
        {granted && (
          <Button asChild size="lg" className="self-start">
            <Link href={`/my-learning/${enrollment.id}/learn`}>
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
              {copy.player.resumeCourse}
            </Link>
          </Button>
        )}
      </header>

      {enrollment.status === "PENDING_PAYMENT" && (
        <PaymentSection enrollment={enrollment} watching={watching} timedOut={timedOut} onAsyncStarted={start} onCheck={start} />
      )}
      {granted && <ModulesSection enrollment={enrollment} />}
      {granted && <LiveSessionsSection courseId={enrollment.courseId} enabled />}
      {granted && <RefundRequestSection enrollmentId={enrollment.id} pricePaid={enrollment.pricePaid} />}
      {showCertificate && <CertificateSection enrollment={enrollment} courseTitle={title} />}
    </div>
  );
}
