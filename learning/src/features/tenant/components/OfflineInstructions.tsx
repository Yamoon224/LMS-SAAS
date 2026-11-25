"use client";

import { Banknote } from "lucide-react";
import { createContext, useContext } from "react";

import { useCopy } from "@/lib/i18n/client";

const OfflineInstructionsContext = createContext<string | null>(null);

/** Fournit les instructions de paiement hors plateforme de l'entreprise (lues côté serveur dans /public/tenant). */
export function OfflineInstructionsProvider({ instructions, children }: { instructions: string | null; children: React.ReactNode }) {
  return <OfflineInstructionsContext.Provider value={instructions}>{children}</OfflineInstructionsContext.Provider>;
}

export function useOfflineInstructions(): string | null {
  return useContext(OfflineInstructionsContext);
}

/**
 * Encadré des instructions de l'organisme (virement, espèces, mobile money…). Texte brut affiché tel quel dans un
 * nœud texte React (jamais interprété comme du HTML) ; ne rend rien si l'organisme n'a pas fourni d'instructions.
 */
export function OfflineInstructionsBox() {
  const copy = useCopy();
  const instructions = useOfflineInstructions();
  if (!instructions) return null;
  return (
    <section aria-label={copy.enroll.offlineInstructionsTitle} className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
      <h3 className="mb-1.5 flex items-center gap-2 font-semibold">
        <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
        {copy.enroll.offlineInstructionsTitle}
      </h3>
      <p className="whitespace-pre-line break-words">{instructions}</p>
    </section>
  );
}
