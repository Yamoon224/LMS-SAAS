import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceSettingsPage } from "@/features/finance-settings/components/FinanceSettingsPage";

export const metadata: Metadata = {
  title: "Paramètres financiers",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Paramètres financiers"
        description="Délai de rétention, seuil et fréquence de reversement, frais de transaction."
      />
      <RequirePermission permission="finance-settings.manage">
        <FinanceSettingsPage />
      </RequirePermission>
    </div>
  );
}
