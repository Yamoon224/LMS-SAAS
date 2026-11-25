"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { activateAccount } from "../api/activate.api";
import { resetPasswordSchema } from "../schemas/password-reset.schema";
import type { ResetPasswordValues } from "../schemas/password-reset.schema";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/spinner";

/** Activation depuis le lien d'invitation `/activate?token=…` : choix du premier mot de passe. */
export function ActivateForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <p role="alert" className="rounded border border-warning/30 bg-warning/10 p-2 text-sm">
        Lien d&apos;activation incomplet. Ouvrez le lien reçu par e-mail, ou demandez un nouvel envoi à votre
        administrateur.
      </p>
    );
  }

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    try {
      await activateAccount(token as string, values.password);
      router.push("/login");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Lien d'activation invalide ou expiré.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="password" label="Mot de passe" error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>
      <Field id="confirmPassword" label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Spinner />}
        Activer mon compte
      </Button>
    </form>
  );
}
