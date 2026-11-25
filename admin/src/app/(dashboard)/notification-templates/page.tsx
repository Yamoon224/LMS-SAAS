import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { NotificationTemplatesPage } from "@/features/notification-templates/components/NotificationTemplatesPage";

export const metadata: Metadata = {
  title: "Modèles d'e-mails",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Modèles d'e-mails"
        description="Sujet et contenu des messages envoyés par la plateforme, en français et en anglais. Sans modification, le texte d'origine est utilisé."
      />
      <NotificationTemplatesPage />
    </div>
  );
}
