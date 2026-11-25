"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { TenantLogo } from "@/components/layout/TenantLogo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useCopy } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  tenantName: string;
  logoUrl?: string | null;
  authenticated: boolean;
  locales: Locale[];
}

export function SiteHeader({ tenantName, logoUrl = null, authenticated, locales }: SiteHeaderProps) {
  const copy = useCopy();
  const pathname = usePathname();

  const links = [
    { href: "/courses", label: copy.nav.catalogue, match: (p: string) => p.startsWith("/courses") },
    ...(authenticated
      ? [
          { href: "/my-learning", label: copy.nav.myLearning, match: (p: string) => p.startsWith("/my-learning") },
          { href: "/certificates", label: copy.nav.certificates, match: (p: string) => p.startsWith("/certificates") },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg">
          <TenantLogo name={tenantName} logoUrl={logoUrl} />
          <span className="min-w-0 max-w-[10rem] truncate font-display text-base font-bold tracking-tight sm:max-w-xs">{tenantName}</span>
        </Link>

        <nav aria-label={copy.nav.main} className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center rounded-md border-b-2 border-transparent px-3 text-sm font-medium transition-colors hover:bg-ink/5",
                  active ? "border-primary font-semibold text-primary" : "text-subtle",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher locales={locales} />
          {authenticated ? (
            <>
              <NotificationBell />
              <UserMenu />
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">{copy.nav.login}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
