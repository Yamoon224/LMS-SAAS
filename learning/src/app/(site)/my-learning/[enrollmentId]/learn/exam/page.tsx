import type { Metadata } from "next";

import { AssessmentInfoPanel } from "@/features/assessments/components/AssessmentInfoPanel";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.quiz.examTitle };
}

export default async function ExamInfoPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  return <AssessmentInfoPanel enrollmentId={enrollmentId} target={{ kind: "exam" }} />;
}
