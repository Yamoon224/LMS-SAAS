import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { CoursesSupervision } from "@/features/supervision/components/CoursesSupervision";

export const metadata: Metadata = {
  title: "Formations",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Formations" description="Toutes les formations de toutes les entreprises, avec statut et langues." />
      <CoursesSupervision />
    </div>
  );
}
