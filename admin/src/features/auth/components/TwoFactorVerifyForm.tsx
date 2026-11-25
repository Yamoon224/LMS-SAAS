"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthApiError, verifyTwoFactor } from "../api/auth.api";
import type { VerifyCodeValues } from "../schemas/two-factor.schema";
import { verifyCodeSchema } from "../schemas/two-factor.schema";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

interface TwoFactorVerifyFormProps {
  onSuccess: () => void;
  /** Défi expiré : retour à la saisie du mot de passe. */
  onRestart: () => void;
}

/** Seconde étape de connexion : code de l'application d'authentification, ou code de récupération. */
export function TwoFactorVerifyForm({ onSuccess, onRestart }: TwoFactorVerifyFormProps) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VerifyCodeValues>({ resolver: zodResolver(verifyCodeSchema), defaultValues: { code: "" } });

  async function submit(values: VerifyCodeValues) {
    setServerError(null);
    try {
      await verifyTwoFactor(values.code);
      onSuccess();
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "DEFI_2FA_INVALIDE") {
        onRestart();
        return;
      }
      reset({ code: "" });
      setServerError(error instanceof Error ? error.message : "Vérification impossible.");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <div>
        <h2 className="text-base font-semibold">Vérification en deux étapes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {useRecovery
            ? "Saisissez l’un de vos codes de récupération (chacun ne sert qu’une fois)."
            : "Saisissez le code à 6 chiffres affiché par votre application d’authentification."}
        </p>
      </div>
      <Field id="2fa-code" label={useRecovery ? "Code de récupération" : "Code de vérification"} error={errors.code?.message}>
        <Input
          id="2fa-code"
          autoComplete="one-time-code"
          inputMode={useRecovery ? "text" : "numeric"}
          maxLength={useRecovery ? 12 : 6}
          placeholder={useRecovery ? "XXXXX-XXXXX" : "123456"}
          aria-invalid={Boolean(errors.code)}
          {...register("code")}
        />
      </Field>
      {serverError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting && <Spinner />}
        Vérifier
      </Button>
      <button
        type="button"
        className="text-center text-sm text-muted-foreground hover:text-brand"
        onClick={() => {
          setUseRecovery((value) => !value);
          reset({ code: "" });
          setServerError(null);
        }}
      >
        {useRecovery ? "Utiliser l’application d’authentification" : "Utiliser un code de récupération"}
      </button>
      <button type="button" className="text-center text-sm text-muted-foreground hover:text-brand" onClick={onRestart}>
        Retour à la connexion
      </button>
    </form>
  );
}
