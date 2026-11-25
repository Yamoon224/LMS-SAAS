import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsPanel } from "@/features/session/components/SettingsPanel";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Paramètres" description="Préférences de votre espace d'administration." />
      <SettingsPanel />
    </div>
  );
}
