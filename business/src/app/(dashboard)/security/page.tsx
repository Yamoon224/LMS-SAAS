import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { TwoFactorSettings } from "@/features/security/components/TwoFactorSettings";

export const metadata: Metadata = {
  title: "Sécurité du compte",
};

export default function SecurityPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Sécurité du compte" description="Double authentification et codes de récupération." />
      <TwoFactorSettings />
    </div>
  );
}
