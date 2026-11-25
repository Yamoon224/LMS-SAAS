"use client";

import { Award, BookOpen, Compass, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCopy } from "@/lib/i18n/client";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

function buildItems(copy: Copy) {
  return [
  { href: "/courses", label: copy.nav.catalogue, icon: Compass, match: (p: string) => p.startsWith("/courses") },
  { href: "/my-learning", label: copy.nav.myLearning, icon: BookOpen, match: (p: string) => p.startsWith("/my-learning") },
  { href: "/certificates", label: copy.nav.certificates, icon: Award, match: (p: string) => p.startsWith("/certificates") },
  { href: "/notifications", label: copy.nav.notifications, icon: Bell, match: (p: string) => p.startsWith("/notifications") },
  ];
}

/** Barre de navigation basse (mobile, apprenant connecté) : pouce-friendly, cibles >= 44px. */
export function MobileNav() {
  const copy = useCopy();
  const pathname = usePathname();
  // Lecteur et tentatives : barre d'actions propre en bas, on masque la navigation globale.
  if (/^\/my-learning\/[^/]+\/(learn|attempts)(\/|$)/.test(pathname)) return null;

  return (
    <nav
      aria-label={copy.nav.mobile}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {buildItems(copy).map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-subtle",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
