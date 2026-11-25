import type { Metadata } from "next";

import { CourseReportPage } from "@/features/course-reports/components/CourseReportPage";

export const metadata: Metadata = {
  title: "Rapport de la formation",
};

interface CourseReportRouteProps {
  params: Promise<{ id: string }>;
}

export default async function CourseReportRoute({ params }: CourseReportRouteProps) {
  const { id } = await params;
  return <CourseReportPage courseId={id} />;
}
