import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { PlatformDashboardView } from "@/features/analytics/components/PlatformDashboard";

export const metadata: Metadata = {
  title: "Analytique",
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytique de la plateforme"
        description="Indicateurs clés tous tenants confondus, filtrables par période."
      />
      <RequirePermission permission="analytics.view">
        <PlatformDashboardView />
      </RequirePermission>
    </div>
  );
}
