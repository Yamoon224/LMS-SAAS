"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCopy, useLocale } from "@/lib/i18n/client";
import { isLocale, LOCALE_COOKIE, LOCALE_NAMES } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Choix de la langue de l'interface (PUB-15) : mémorisé dans un cookie, la page est rechargée côté serveur. */
export function LanguageSwitcher({ locales }: { locales: Locale[] }) {
  const copy = useCopy();
  const current = useLocale();
  const router = useRouter();

  if (locales.length < 2) return null;

  function onChange(value: string) {
    if (!isLocale(value)) return;
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    router.refresh();
  }

  return (
    <label className="flex min-h-[44px] items-center gap-1.5 text-sm text-subtle">
      <Languages aria-hidden="true" className="hidden h-4 w-4 sm:block" />
      <span className="sr-only">{copy.nav.language}</span>
      <select
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[44px] max-w-[7rem] rounded-lg border border-line bg-card px-2 py-1.5 text-sm sm:min-h-0"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {LOCALE_NAMES[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
