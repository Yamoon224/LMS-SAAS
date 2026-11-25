import type { Metadata } from "next";

import { AttemptScreen } from "@/features/assessments/components/AttemptScreen";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.quiz.quizTitle };
}

export default async function AttemptPage({ params }: { params: Promise<{ enrollmentId: string; attemptId: string }> }) {
  const { enrollmentId, attemptId } = await params;
  return <AttemptScreen enrollmentId={enrollmentId} attemptId={attemptId} />;
}
