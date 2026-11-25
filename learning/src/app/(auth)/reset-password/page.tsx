import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.auth.resetTitle };
}

export default async function ResetPasswordPage() {
  const copy = await getCopy();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{copy.auth.resetTitle}</h1>
      <p className="mb-6 mt-2 text-sm text-subtle">{copy.auth.resetSubtitle}</p>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
