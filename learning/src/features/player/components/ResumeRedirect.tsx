"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useCourseContent } from "../hooks/usePlayer";
import { flattenLessons, pickResumeLesson } from "../lib/outline";

import { EmptyState } from "@/components/feedback/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/lib/i18n/client";

/** /learn : redirige vers la première leçon non terminée (ou accessible). */
export function ResumeRedirect({ enrollmentId }: { enrollmentId: string }) {
  const copy = useCopy();
  const router = useRouter();
  const content = useCourseContent(enrollmentId);
  const target = content.data ? pickResumeLesson(flattenLessons(content.data)) : undefined;

  useEffect(() => {
    if (target) router.replace(`/my-learning/${enrollmentId}/learn/${target.id}`);
  }, [target, router, enrollmentId]);

  if (content.data && !target) return <EmptyState icon={BookOpen} message={copy.player.emptyOutline} />;
  return <Skeleton className="h-64" />;
}
