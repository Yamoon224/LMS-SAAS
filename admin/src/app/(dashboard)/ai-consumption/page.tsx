import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { AiConsumptionPage } from "@/features/ai-consumption/components/AiConsumptionPage";

export const metadata: Metadata = {
  title: "Consommation IA",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Consommation IA"
        description="Tâches de traduction par entreprise, crédits consommés, coût fournisseur estimé et marge."
      />
      <AiConsumptionPage />
    </div>
  );
}
