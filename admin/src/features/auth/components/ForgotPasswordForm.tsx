"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset } from "../api/password-reset.api";
import { forgotPasswordSchema } from "../schemas/password-reset.schema";
import type { ForgotPasswordValues } from "../schemas/password-reset.schema";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-bar";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/** Demande d'un lien de réinitialisation ; la confirmation est identique que le compte existe ou non. */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "La demande n'a pas pu être envoyée.");
    }
  }

  if (sent) {
    return (
      <div role="status" className="rounded border border-border bg-surface-muted p-3 text-sm">
        <p className="font-medium">Demande envoyée</p>
        <p className="mt-1 text-muted-foreground">
          Si un compte actif correspond à cette adresse, un lien valable 1 heure vient de lui être envoyé. Pensez à
          vérifier vos courriers indésirables.
        </p>
        <Link href="/login" className="mt-3 inline-block text-brand hover:underline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="email" label="E-mail" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@plateforme.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      {serverError && (
        <p role="alert" className="rounded border border-danger/30 bg-danger/10 p-2 text-sm text-danger">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Spinner />}
        Envoyer le lien
      </Button>
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-brand">
        Retour à la connexion
      </Link>
    </form>
  );
}
