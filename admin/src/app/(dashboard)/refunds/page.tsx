import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { RefundsPage } from "@/features/refunds/components/RefundsPage";

export const metadata: Metadata = {
  title: "Remboursements",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Remboursements"
        description="Demandes des apprenants acceptées par les entreprises, à exécuter auprès du fournisseur de paiement."
      />
      <RefundsPage />
    </div>
  );
}
