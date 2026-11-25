import type { Metadata } from "next";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { TenantDetail } from "@/features/tenants/components/TenantDetail";

export const metadata: Metadata = {
  title: "Fiche entreprise",
};

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;

  return (
    <RequirePermission permission="tenants.read">
      <TenantDetail tenantId={id} />
    </RequirePermission>
  );
}
