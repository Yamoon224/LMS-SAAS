"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import { formatRecoveryCodesFile } from "../schemas/two-factor.schema";

import { Button } from "@/components/ui/button";

interface RecoveryCodesPanelProps {
  codes: readonly string[];
  /** Appelé quand l'utilisateur confirme avoir conservé les codes (ils ne seront plus jamais affichés). */
  onDone: () => void;
  doneLabel?: string;
}

/** Affichage UNIQUE des codes de récupération : copie, téléchargement, puis confirmation explicite. */
export function RecoveryCodesPanel({ codes, onDone, doneLabel = "J’ai conservé mes codes" }: RecoveryCodesPanelProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setSaved(true);
    } catch {
      // presse-papiers indisponible (contexte non sécurisé) : le téléchargement reste possible
    }
  }

  function download() {
    const blob = new Blob([formatRecoveryCodesFile(codes)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "codes-de-recuperation.txt";
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded border border-warning/40 bg-warning/10 p-3 text-sm">
        Ces codes ne seront <strong>plus jamais affichés</strong>. Chacun ne sert qu’une fois, si vous perdez
        l’accès à votre application d’authentification. Conservez-les en lieu sûr.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-accent/40 p-3 font-mono text-sm" aria-label="Codes de récupération">
        {codes.map((code) => (
          <li key={code} className="select-all text-center tracking-wider">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiés" : "Copier"}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
        <Button type="button" className="sm:ml-auto" disabled={!saved} onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
      {!saved && <p className="text-xs text-muted-foreground">Copiez ou téléchargez les codes pour continuer.</p>}
    </div>
  );
}
