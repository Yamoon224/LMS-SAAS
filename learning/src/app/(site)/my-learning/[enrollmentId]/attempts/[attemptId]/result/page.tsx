import type { Metadata } from "next";

import { ResultView } from "@/features/assessments/components/ResultView";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.quiz.resultTitle };
}

export default async function AttemptResultPage({ params }: { params: Promise<{ enrollmentId: string; attemptId: string }> }) {
  const { enrollmentId, attemptId } = await params;
  return <ResultView enrollmentId={enrollmentId} attemptId={attemptId} />;
}
