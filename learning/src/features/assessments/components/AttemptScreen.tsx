"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useAttempt } from "../hooks/useAssessments";

import { ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { errorDetail } from "@/lib/api-client";
import { useCopy } from "@/lib/i18n/client";

// Le runner (minuteur, sauvegarde, dialogues) n'est chargé que sur cette page.
const AttemptRunner = dynamic(() => import("./AttemptRunner").then((m) => m.AttemptRunner), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto h-96 max-w-3xl" />,
});

/** Charge la tentative ; si elle est déjà terminée, redirige vers le résultat. */
export function AttemptScreen({ enrollmentId, attemptId }: { enrollmentId: string; attemptId: string }) {
  const copy = useCopy();
  const router = useRouter();
  const search = useSearchParams().toString();
  const queryClient = useQueryClient();
  const attempt = useAttempt(attemptId);
  const finished = attempt.data && attempt.data.status !== "IN_PROGRESS";
  const resultUrl = `/my-learning/${enrollmentId}/attempts/${attemptId}/result${search ? `?${search}` : ""}`;

  useEffect(() => {
    if (finished) router.replace(resultUrl);
  }, [finished, router, resultUrl]);

  if (attempt.isLoading || finished) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (attempt.isError || !attempt.data) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <ErrorState
          title={copy.quiz.attemptLoadError}
          detail={errorDetail(attempt.error)}
          onRetry={() => void attempt.refetch()}
        />
        <Link href={`/my-learning/${enrollmentId}/learn`} className="flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">←</span> {copy.quiz.backToPlayer}
        </Link>
      </div>
    );
  }

  return (
    <AttemptRunner
      key={attempt.data.id}
      attempt={attempt.data}
      receivedAt={attempt.dataUpdatedAt || queryClient.getQueryState(["attempt", attemptId])?.dataUpdatedAt || Date.now()}
      enrollmentId={enrollmentId}
    />
  );
}
