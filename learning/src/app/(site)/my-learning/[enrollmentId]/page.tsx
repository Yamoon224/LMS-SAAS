import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EnrollmentHub } from "@/features/enrollments/components/EnrollmentHub";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.learning.title };
}

export default async function EnrollmentPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <EnrollmentHub enrollmentId={enrollmentId} />
    </Suspense>
  );
}
