"use client";

import { Languages } from "lucide-react";

import { useContentLocale } from "../hooks/useContentLocale";
import { useCourseLocales } from "../hooks/usePlayer";

import { useCopy } from "@/lib/i18n/client";
import { LOCALE_NAMES } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/locales";

function languageName(code: string): string {
  return LOCALE_NAMES[code as Locale] ?? code;
}

/**
 * PUB-17 : choix de la langue de lecture de la formation. Masqué quand la formation n'existe que dans une langue.
 * Ne modifie pas la langue de l'interface (PUB-15) ni la progression, qui est commune à toutes les langues.
 */
export function ContentLanguageSwitcher({ enrollmentId }: { enrollmentId: string }) {
  const copy = useCopy();
  const locales = useCourseLocales(enrollmentId);
  const [chosen, setChosen] = useContentLocale(enrollmentId);

  if (!locales.data || locales.data.available.length < 2) return null;

  const { sourceLocale, available } = locales.data;
  // Une préférence devenue indisponible (langue retirée) s'affiche comme la langue d'origine : le serveur y retombe.
  const current = chosen && available.includes(chosen) ? chosen : sourceLocale;

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
      <label htmlFor="content-language" className="sr-only">
        {copy.playerLocale.label}
      </label>
      <select
        id="content-language"
        value={current}
        onChange={(event) => setChosen(event.target.value === sourceLocale ? undefined : event.target.value)}
        className="min-h-[44px] max-w-[9rem] rounded-lg border border-line bg-card px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {available.map((code) => (
          <option key={code} value={code}>
            {languageName(code)}
          </option>
        ))}
      </select>
    </div>
  );
}
