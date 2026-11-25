import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { CreatePlanForm } from "@/features/plans/components/CreatePlanForm";

export const metadata: Metadata = {
  title: "Nouveau plan",
};

export default function NewPlanPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Nouveau plan tarifaire"
        description="Définit les quotas et fonctionnalités d’un plan. Le prix se définit séparément une fois le plan créé."
      />
      <RequirePermission permission="plans.manage">
        <CreatePlanForm />
      </RequirePermission>
    </div>
  );
}
