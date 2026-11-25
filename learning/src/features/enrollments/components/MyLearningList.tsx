"use client";

import { BookOpen } from "lucide-react";

import { useMyEnrollments } from "../hooks/useEnrollments";

import { EnrollmentCard } from "./EnrollmentCard";

import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/lib/i18n/client";

export function MyLearningList() {
  const copy = useCopy();
  const { data, isLoading, isError, error, refetch } = useMyEnrollments();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label={copy.common.loading}>
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <ErrorState
        title={copy.learning.errorTitle}
        detail={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data || data.length === 0) {
    return <EmptyState icon={BookOpen} message={copy.learning.empty} action={{ href: "/courses", label: copy.learning.emptyCta }} />;
  }

  return (
    <ul className="flex flex-col gap-4">
      {data.map((enrollment) => (
        <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
      ))}
    </ul>
  );
}
