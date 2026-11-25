import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { PaymentsPage } from "@/features/payments/components/PaymentsPage";

export const metadata: Metadata = {
  title: "Paiements",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Paiements" description="Fournisseurs de paiement et remboursements." />
      <PaymentsPage />
    </div>
  );
}
