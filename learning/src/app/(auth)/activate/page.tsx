import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivateForm } from "@/features/auth/components/ActivateForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.auth.activateTitle };
}

export default async function ActivatePage() {
  const copy = await getCopy();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{copy.auth.activateTitle}</h1>
      <p className="mb-6 mt-2 text-sm text-subtle">{copy.auth.activateSubtitle}</p>
      <Suspense fallback={null}>
        <ActivateForm />
      </Suspense>
    </>
  );
}
