"use client";

import { useEffect, useRef, useState } from "react";

import { normalizeHttpsUrl } from "../lib/url";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlPromptProps {
  label: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

/** Saisie d'une adresse https (lien ou image) : accessible au clavier (Entrée valide, Échap annule), erreur annoncée. */
export function UrlPrompt({ label, onSubmit, onCancel }: UrlPromptProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Le champ reçoit le focus à l'ouverture (le clavier reste dans l'invite).
  useEffect(() => inputRef.current?.focus(), []);

  function submit() {
    const url = normalizeHttpsUrl(value);
    if (!url) {
      setError("Saisissez une adresse commençant par https://");
      return;
    }
    onSubmit(url);
  }

  return (
    <div className="flex flex-col gap-1" role="group" aria-label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          type="url"
          inputMode="url"
          aria-label={label}
          aria-invalid={error !== null}
          aria-describedby={error ? "url-prompt-error" : undefined}
          placeholder="https://exemple.com"
          value={value}
          className="h-8 min-w-0 flex-1"
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
        />
        <Button type="button" size="sm" onClick={submit}>
          Insérer
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
      {error && (
        <p id="url-prompt-error" role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
