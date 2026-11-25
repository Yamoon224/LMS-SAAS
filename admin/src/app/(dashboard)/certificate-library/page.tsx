import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { CertificateLibraryPage } from "@/features/certificate-library/components/CertificateLibraryPage";

export const metadata: Metadata = {
  title: "Modèles de certificats",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Modèles de certificats"
        description="Bibliothèque de modèles proposés aux entreprises : police, couleurs, orientation, bordure."
      />
      <CertificateLibraryPage />
    </div>
  );
}
