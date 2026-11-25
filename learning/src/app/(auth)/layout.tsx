import Link from "next/link";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Card, CardContent } from "@/components/ui/card";
import { getTenantProfile } from "@/features/tenant/tenant.server";
import { LOCALES } from "@/lib/i18n/locales";
import { getCopy, getEnabledLocales } from "@/lib/i18n/server";

/** Pages d'authentification : carte centrée, mobile-first. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [tenant, copy, enabledLocales] = await Promise.all([getTenantProfile(), getCopy(), getEnabledLocales()]);
  const name = tenant.name;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-canvas px-4 py-8">
      <div className="mb-2 flex w-full max-w-md justify-end">
        <LanguageSwitcher locales={enabledLocales ?? [...LOCALES]} />
      </div>
      <Link href="/" className="mb-6 flex min-h-[44px] items-center gap-2.5">
        <TenantLogo name={name} logoUrl={tenant.logoUrl} size="md" />
        <span className="text-lg font-bold tracking-tight">{name}</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">{children}</CardContent>
      </Card>
      <Link href="/" className="mt-6 flex min-h-[44px] items-center text-sm text-subtle hover:text-ink hover:underline">
        {copy.course.backToCatalogue}
      </Link>
    </main>
  );
}
