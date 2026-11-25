import type { Metadata } from "next";

import { ExamAttemptsPage } from "@/features/assessments/components/ExamAttemptsPage";

export const metadata: Metadata = {
  title: "Tentatives d'examen",
};

interface ExamAttemptsRouteProps {
  params: Promise<{ id: string }>;
}

export default async function ExamAttemptsRoute({ params }: ExamAttemptsRouteProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <ExamAttemptsPage courseId={id} />
    </div>
  );
}
