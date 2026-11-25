import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { LearnerDashboard } from "@/features/dashboard/components/LearnerDashboard";
import { MyLearningList } from "@/features/enrollments/components/MyLearningList";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.learning.title, robots: { index: false } };
}

export default async function MyLearningPage() {
  const copy = await getCopy();
  return (
    <div className="flex flex-col gap-8">
      <div>
        <PageHeader title={copy.learning.title} subtitle={copy.learning.subtitle} />
        <LearnerDashboard />
      </div>
      <section aria-labelledby="all-courses" className="flex flex-col gap-4">
        <h2 id="all-courses" className="text-lg font-semibold">
          {copy.vitrine.dashboard.allCourses}
        </h2>
        <MyLearningList />
      </section>
    </div>
  );
}
