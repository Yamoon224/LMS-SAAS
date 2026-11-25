import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCopy } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getCopy();
  return { title: copy.nav.login };
}

export default async function LoginPage() {
  const copy = await getCopy();
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{copy.auth.loginTitle}</h1>
      <p className="mb-6 mt-2 text-sm text-subtle">{copy.auth.loginSubtitle}</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          {copy.auth.forgotLink}
        </Link>
      </p>
      <p className="mt-4 text-center text-sm text-subtle">
        {copy.auth.noAccount}{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {copy.auth.noAccountCta}
        </Link>
      </p>
    </>
  );
}
