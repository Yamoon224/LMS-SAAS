import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const copy = await getCopy();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{copy.auth.forgotTitle}</h1>
      <p className="mb-6 mt-2 text-sm text-subtle">{copy.auth.forgotSubtitle}</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-subtle">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {copy.auth.backToLogin}
        </Link>
      </p>
    </>
  );
}
