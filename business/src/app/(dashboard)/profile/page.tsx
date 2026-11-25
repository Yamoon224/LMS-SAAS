import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { ProfilePanel } from "@/features/session/components/ProfilePanel";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Profil" description="Informations du compte connecté." />
      <ProfilePanel />
    </div>
  );
}
