import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/PageHeader";
import { PurchasesPage } from "@/features/purchases/components/PurchasesPage";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.purchases.title };
}

export default async function Page() {
  const copy = await getCopy();
  return (
    <>
      <PageHeader title={copy.purchases.title} subtitle={copy.purchases.subtitle} />
      <PurchasesPage />
    </>
  );
}
