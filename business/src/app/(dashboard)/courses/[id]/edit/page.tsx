import type { Metadata } from "next";

import { EditCoursePage } from "@/features/courses/components/EditCoursePage";

export const metadata: Metadata = {
  title: "Modifier la formation",
};

interface CourseEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseEditRoute({ params }: CourseEditPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl">
      <EditCoursePage courseId={id} />
    </div>
  );
}
