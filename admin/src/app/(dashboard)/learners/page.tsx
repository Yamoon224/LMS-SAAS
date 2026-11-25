import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { LearnersSupervision } from "@/features/supervision/components/LearnersSupervision";

export const metadata: Metadata = {
  title: "Apprenants",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Apprenants" description="Tous les apprenants, filtrables par entreprise." />
      <LearnersSupervision />
    </div>
  );
}
