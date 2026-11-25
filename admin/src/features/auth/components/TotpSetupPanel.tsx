"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { TotpCodeValues, TwoFactorSetup } from "../schemas/two-factor.schema";
import { groupSecret, totpCodeSchema } from "../schemas/two-factor.schema";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface TotpSetupPanelProps {
  setup: TwoFactorSetup;
  /** Confirme avec le premier code ; doit lever une Error (message affiché) si le code est refusé. */
  onConfirm: (code: string) => Promise<void>;
  onCancel?: () => void;
}

/** QR code + secret en clair (saisie manuelle) + champ du premier code, commun à l'enrôlement et à la page Sécurité. */
export function TotpSetupPanel({ setup, onConfirm, onCancel }: TotpSetupPanelProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpCodeValues>({ resolver: zodResolver(totpCodeSchema), defaultValues: { code: "" } });

  async function submit(values: TotpCodeValues) {
    setServerError(null);
    try {
      await onConfirm(values.code);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Vérification impossible.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Ouvrez une application d’authentification (Google Authenticator, Microsoft Authenticator, Authy…).</li>
        <li>Scannez le QR code, ou saisissez la clé ci-dessous.</li>
        <li>Entrez le code à 6 chiffres qu’elle affiche.</li>
      </ol>
      <div className="flex justify-center rounded-lg border border-border bg-white p-2">
        <img src={setup.qrCodeDataUrl} alt="QR code à scanner dans l’application d’authentification" width={200} height={200} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Clé secrète (saisie manuelle)</span>
        <code className="select-all break-all rounded border border-border bg-accent/40 px-2 py-1.5 font-mono text-sm tracking-wider">
          {groupSecret(setup.secret)}
        </code>
      </div>
      <Field id="totp-code" label="Code de vérification" error={errors.code?.message}>
        <Input
          id="totp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          aria-invalid={Boolean(errors.code)}
          {...register("code")}
        />
      </Field>
      {serverError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Activer la double authentification
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
