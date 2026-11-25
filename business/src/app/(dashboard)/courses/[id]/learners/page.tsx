import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LearnersList } from "@/features/enrollments/components/LearnersList";

export const metadata: Metadata = {
  title: "Apprenants",
};

interface CourseLearnersPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseLearnersPage({ params }: CourseLearnersPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Link
        href={`/courses/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à la fiche formation
      </Link>
      <LearnersList courseId={id} />
    </div>
  );
}
