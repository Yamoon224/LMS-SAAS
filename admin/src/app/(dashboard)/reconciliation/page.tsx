import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { ReconciliationPage } from "@/features/reconciliation/components/ReconciliationPage";

export const metadata: Metadata = {
  title: "Rapprochement",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rapprochement des paiements"
        description="Paiements en attente anciens, webhooks en échec à rejouer, paiements en double suspects."
      />
      <RequirePermission permission="payments.reconcile">
        <ReconciliationPage />
      </RequirePermission>
    </div>
  );
}
