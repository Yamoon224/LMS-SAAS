import type { Metadata } from "next";

import { EnrollmentDetail } from "@/features/enrollments/components/EnrollmentDetail";

export const metadata: Metadata = {
  title: "Fiche apprenant",
};

interface EnrollmentDetailPageProps {
  params: Promise<{ id: string; enrollmentId: string }>;
}

export default async function EnrollmentDetailPage({ params }: EnrollmentDetailPageProps) {
  const { id, enrollmentId } = await params;

  return (
    <div className="mx-auto max-w-3xl">
      <EnrollmentDetail courseId={id} enrollmentId={enrollmentId} />
    </div>
  );
}
