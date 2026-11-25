import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { PlatformHealthPage } from "@/features/platform-health/components/PlatformHealthPage";

export const metadata: Metadata = {
  title: "Santé technique",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Santé technique"
        description="État des files de tâches, taux d'erreur des webhooks de paiement et espace de stockage global."
      />
      <PlatformHealthPage />
    </div>
  );
}
