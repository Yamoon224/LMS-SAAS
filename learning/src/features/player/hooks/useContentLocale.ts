"use client";

import { useCallback, useSyncExternalStore } from "react";

import { getContentLocale, setContentLocale, subscribeContentLocale } from "../lib/content-locale-store";

/**
 * Langue de lecture choisie pour cette inscription (`undefined` = langue d'origine) et son setter. Côté serveur le
 * rendu part toujours de la langue d'origine : le choix mémorisé s'applique à l'hydratation.
 */
export function useContentLocale(enrollmentId: string): [string | undefined, (locale: string | undefined) => void] {
  const locale = useSyncExternalStore(
    subscribeContentLocale,
    () => getContentLocale(enrollmentId),
    () => "",
  );
  const set = useCallback((next: string | undefined) => setContentLocale(enrollmentId, next ?? ""), [enrollmentId]);
  return [locale || undefined, set];
}
