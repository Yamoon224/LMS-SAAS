"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { LOGO_ACCEPT, LOGO_MAX_BYTES, uploadTenantLogo } from "../api/tenants.api";
import { isLogoUrl } from "../schemas/tenant.schema";

import { TenantLogo } from "./TenantLogo";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface LogoFieldProps {
  /** Adresse actuelle du logo (vide = aucun). */
  value: string;
  onChange: (url: string) => void;
  /** Nom de l'entreprise, pour les initiales de l'aperçu. */
  name: string;
  /** Erreur de validation de l'adresse. */
  error?: string;
}

function describe(failure: unknown): string {
  return failure instanceof Error && failure.message ? failure.message : "Le téléversement a échoué.";
}

/**
 * Logo : deux façons de le fournir, au choix — importer une image (PNG, JPG ou WebP, 2 Mo) ou coller un lien https.
 * Les deux alimentent la même valeur : importer remplit le champ lien, le lien saisi prend la place du fichier.
 */
export function LogoField({ value, onChange, name, error }: LogoFieldProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const preview = isLogoUrl(value.trim()) ? value.trim() : null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!LOGO_ACCEPT.split(",").includes(file.type)) {
      setUploadError("Format non pris en charge : utilisez une image PNG, JPG ou WebP.");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setUploadError(`Le logo ne peut pas dépasser ${LOGO_MAX_BYTES / (1024 * 1024)} Mo.`);
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadTenantLogo(file));
    } catch (failure) {
      setUploadError(describe(failure));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <TenantLogo name={name || "?"} logoUrl={preview} size="lg" />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            id={`${inputId}-file`}
            type="file"
            accept={LOGO_ACCEPT}
            className="sr-only"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {value ? "Remplacer l’image" : "Importer une image"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => onChange("")}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Retirer
            </Button>
          )}
        </div>
      </div>
      {uploadError && (
        <p role="alert" className="text-xs text-danger">
          {uploadError}
        </p>
      )}

      <Field id={`${inputId}-url`} label="ou coller un lien" error={error} hint="PNG, JPG ou WebP · 2 Mo maximum pour un fichier importé.">
        <Input
          id={`${inputId}-url`}
          type="url"
          placeholder="https://…/logo.png"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
      </Field>
    </div>
  );
}
