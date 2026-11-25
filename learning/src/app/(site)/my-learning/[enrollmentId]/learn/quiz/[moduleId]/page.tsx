import type { Metadata } from "next";

import { AssessmentInfoPanel } from "@/features/assessments/components/AssessmentInfoPanel";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.quiz.quizTitle };
}

export default async function QuizInfoPage({ params }: { params: Promise<{ enrollmentId: string; moduleId: string }> }) {
  const { enrollmentId, moduleId } = await params;
  return <AssessmentInfoPanel enrollmentId={enrollmentId} target={{ kind: "quiz", moduleId }} />;
}
