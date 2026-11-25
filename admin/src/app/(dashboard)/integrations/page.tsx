import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { IntegrationsPage } from "@/features/integrations/components/IntegrationsPage";

export const metadata: Metadata = {
  title: "Intégrations",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Intégrations"
        description="Fournisseurs externes de la plateforme : traduction IA, e-mail, SMS, Google."
      />
      <IntegrationsPage />
    </div>
  );
}
