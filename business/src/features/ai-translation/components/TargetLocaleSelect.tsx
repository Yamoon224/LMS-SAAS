"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import { useEnabledLanguages } from "../hooks/useAiTranslation";

interface TargetLocaleSelectProps {
  registration: UseFormRegisterReturn;
  invalid: boolean;
}

/** Liste des langues activées par la plateforme (ADM-40) ; le backend refuse toute autre valeur. */
export function TargetLocaleSelect({ registration, invalid }: TargetLocaleSelectProps) {
  const languages = useEnabledLanguages();
  const placeholder = languages.isError ? "Langues indisponibles" : "Choisir…";

  return (
    <select
      id="targetLocale"
      aria-invalid={invalid}
      disabled={languages.isLoading || languages.isError}
      className="h-11 w-48 rounded-lg border border-border bg-surface px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-9 sm:text-sm"
      {...registration}
    >
      <option value="">{placeholder}</option>
      {languages.data?.map((language) => (
        <option key={language.code} value={language.code}>
          {language.nativeName} ({language.code})
        </option>
      ))}
    </select>
  );
}
