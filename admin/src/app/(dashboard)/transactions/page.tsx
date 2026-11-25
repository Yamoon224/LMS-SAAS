import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { TransactionsSupervision } from "@/features/supervision/components/TransactionsSupervision";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transactions" description="Tous les paiements : abonnements, crédits IA et ventes de formations." />
      <TransactionsSupervision />
    </div>
  );
}
