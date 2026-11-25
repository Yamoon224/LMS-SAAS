import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { LegalPage } from "@/features/legal/components/LegalPage";

export const metadata: Metadata = {
  title: "Pages légales",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pages légales"
        description="CGU, CGV et politique de confidentialité de la plateforme, versionnées. Une version publiée est définitive."
      />
      <LegalPage />
    </div>
  );
}
