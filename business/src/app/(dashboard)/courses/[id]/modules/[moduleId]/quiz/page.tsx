import type { Metadata } from "next";

import { QuizPage } from "@/features/assessments/components/QuizPage";

export const metadata: Metadata = {
  title: "Quiz du module",
};

interface ModuleQuizRouteProps {
  params: Promise<{ id: string; moduleId: string }>;
}

export default async function ModuleQuizRoute({ params }: ModuleQuizRouteProps) {
  const { id, moduleId } = await params;

  return (
    <div className="mx-auto max-w-3xl">
      <QuizPage courseId={id} moduleId={moduleId} />
    </div>
  );
}
