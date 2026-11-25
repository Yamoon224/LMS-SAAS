import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { VerifyForm } from "@/features/certificates/components/VerifyForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.verify.title };
}

export default async function VerifyIndexPage() {
  const copy = await getCopy();
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={copy.verify.title} subtitle={copy.verify.subtitle} />
      <VerifyForm />
    </div>
  );
}
