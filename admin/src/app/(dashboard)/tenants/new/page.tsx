import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RequirePermission } from "@/components/feedback/RequirePermission";
import { PageHeader } from "@/components/ui/page-header";
import { CreateTenantWizard } from "@/features/tenants/components/CreateTenantWizard";

export const metadata: Metadata = {
  title: "Nouvelle entreprise",
};

export default function NewTenantPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/tenants" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Retour aux entreprises
        </Link>
        <PageHeader
          title="Nouvelle entreprise"
          description="Création guidée en étapes : l’entreprise (en brouillon), son compte Propriétaire et ses paramètres de facturation."
        />
      </div>
      <RequirePermission permission="tenants.create">
        <CreateTenantWizard />
      </RequirePermission>
    </div>
  );
}
