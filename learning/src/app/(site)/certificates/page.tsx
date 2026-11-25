import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { CertificatesPage } from "@/features/certificates/components/CertificatesPage";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.certificates.title };
}

export default async function Page() {
  const copy = await getCopy();
  return (
    <>
      <PageHeader title={copy.certificates.title} subtitle={copy.certificates.subtitle} />
      <CertificatesPage />
    </>
  );
}
