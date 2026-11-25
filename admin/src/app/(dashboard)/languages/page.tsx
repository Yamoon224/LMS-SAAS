import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { LanguagesPage } from "@/features/languages/components/LanguagesPage";

export const metadata: Metadata = {
  title: "Langues",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Langues"
        description="Les huit langues de la plateforme. Le français est la langue par défaut et reste toujours actif."
      />
      <LanguagesPage />
    </div>
  );
}
