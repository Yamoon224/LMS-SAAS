"use client";

import { createContext, useContext, useMemo } from "react";

import { dictionaries } from "./dictionaries";
import type { Locale } from "./locales";
import type { Copy } from "./types";

interface I18nValue {
  locale: Locale;
  copy: Copy;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Fournit la langue et son dictionnaire aux composants client. Seule la langue (une chaîne) traverse la
 * frontière serveur -> client : le dictionnaire contient des fonctions, qui ne sont pas sérialisables, il est
 * donc retrouvé ici à partir de la langue.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, copy: dictionaries[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useCopy / useLocale doivent être utilisés sous <I18nProvider>.");
  return value;
}

/** Dictionnaire de la langue courante (composants client). */
export function useCopy(): Copy {
  return useI18n().copy;
}

/** Langue courante (composants client). */
export function useLocale(): Locale {
  return useI18n().locale;
}
