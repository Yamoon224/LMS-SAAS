import type { Metadata } from "next";

import { ExamPage } from "@/features/assessments/components/ExamPage";

export const metadata: Metadata = {
  title: "Examen final",
};

interface CourseExamRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CourseExamRoute({ params }: CourseExamRouteProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl">
      <ExamPage courseId={id} />
    </div>
  );
}
