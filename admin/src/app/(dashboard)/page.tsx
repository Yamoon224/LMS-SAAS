import { PageHeader } from "@/components/ui/page-header";
import { DashboardHome } from "@/features/dashboard/components/DashboardHome";

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tableau de bord global"
        description="Vue d’ensemble de la plateforme SaaS LMS (Côte d’Ivoire / UEMOA / Afrique de l’Ouest)."
      />
      <DashboardHome />
    </div>
  );
}
