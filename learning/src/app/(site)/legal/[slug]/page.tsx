import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/PageHeader";
import { getLegalDocument } from "@/features/legal/api/legal.server";
import { LegalDocumentView } from "@/features/legal/components/LegalDocumentView";
import { findLegalPage } from "@/features/legal/legal-pages";
import { getCopy } from "@/lib/i18n/server";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const copy = await getCopy();
  const page = findLegalPage((await params).slug);
  return { title: page ? (copy.legal.pages[page.slug] ?? page.slug) : copy.legal.unavailableTitle };
}

/** ADM-41 : version courante d'une page légale de la plateforme (Server Component). */
export default async function LegalRoute({ params }: LegalPageProps) {
  const copy = await getCopy();
  const page = findLegalPage((await params).slug);
  if (!page) notFound();

  const result = await getLegalDocument(page.type);
  if (!result.ok) {
    return (
      <>
        <PageHeader title={(copy.legal.pages[page.slug] ?? page.slug)} />
        <ErrorState
          title={copy.legal.unavailableTitle}
          detail={result.status === 404 ? copy.legal.unavailableDetail : result.message}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={result.data.title} />
      <LegalDocumentView document={result.data} />
    </>
  );
}
