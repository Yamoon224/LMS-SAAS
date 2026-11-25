import type { Metadata } from "next";

import { CourseDetail } from "@/features/courses/components/CourseDetail";

export const metadata: Metadata = {
  title: "Fiche formation",
};

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <CourseDetail courseId={id} />
    </div>
  );
}
