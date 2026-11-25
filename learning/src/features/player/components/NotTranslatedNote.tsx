"use client";

import { useContentLocale } from "../hooks/useContentLocale";

import { useCopy } from "@/lib/i18n/client";

/**
 * PUB-17 : une langue est choisie mais cette leçon n'a pas de traduction publiée — le serveur a servi la langue
 * d'origine, on l'explique plutôt que de laisser croire à un défaut d'affichage.
 */
export function NotTranslatedNote({ enrollmentId, servedLocale }: { enrollmentId: string; servedLocale: string }) {
  const copy = useCopy();
  const [chosenLocale] = useContentLocale(enrollmentId);
  if (!chosenLocale || !servedLocale || chosenLocale === servedLocale) return null;

  return (
    <p role="status" className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-subtle">
      {copy.playerLocale.notTranslated}
    </p>
  );
}
