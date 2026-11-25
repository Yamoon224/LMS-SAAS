import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { CertificatesSupervision } from "@/features/supervision/components/CertificatesSupervision";

export const metadata: Metadata = {
  title: "Certificats",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Certificats" description="Registre global des certificats délivrés." />
      <CertificatesSupervision />
    </div>
  );
}
