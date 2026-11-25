import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { NewTenantButton } from "@/features/tenants/components/NewTenantButton";
import { TenantList } from "@/features/tenants/components/TenantList";

export const metadata: Metadata = {
  title: "Entreprises",
};

export default function TenantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Entreprises"
        description="Gestion des entreprises clientes de la plateforme."
        actions={<NewTenantButton />}
      />
      <RequirePermission permission="tenants.read">
        <TenantList />
      </RequirePermission>
    </div>
  );
}
